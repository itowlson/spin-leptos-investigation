use leptos::{IntoView, ServerFn};
use leptos_router::RouteListing;
use spin_sdk::http::{ResponseOutparam, IncomingRequest, OutgoingResponse, Headers};
use spin_sdk::http_component;
use futures::StreamExt;
use futures::SinkExt;
// use crate::app;

#[http_component]
async fn handle_what_could_go_wrong(req: IncomingRequest, resp_out: ResponseOutparam) {
    // let site_root = "http://localhost:3031/";
    let mut conf = leptos::get_configuration(None).await.unwrap();
    conf.leptos_options.output_name = "what_could_go_wrong".to_owned();

    let routes = generate_route_list(crate::app::App);

    crate::app::SaveCount::register_explicit().unwrap();

    let url = url::Url::parse(&req.uri()).unwrap();
    let path = url.path();

    let mut rf = routefinder::Router::new();
    for listing in routes{
        let path = listing.path().to_owned();
        rf.add(path, Some(listing)).unwrap();
    }
    rf.add("/api/*", None).unwrap();

    // TODO: do we need to provide fallback to next best match if method does not match?  Probably
    let best_listing = rf.best_match(path).unwrap();
    // TODO: ensure req.method() is acceptable

    let Some(best_listing) = best_listing.as_ref() else {
        handle_server_fns(req, resp_out).await;
        return;
    };

    if let Some(_static_mode) = best_listing.static_mode() {
        println!("GOT {}: using static mode", path);
        todo!("run static mode handler");
        // router.add(path, to_sdk(method), app_to_sdk(crate::app::App));
    } else {
        println!("GOT {}: using DYNAMIC! mode", path);
        match best_listing.mode() {
            leptos_router::SsrMode::OutOfOrder => {
                let res_options = crate::spleppy::ResponseOptions::default();
                let app = {
                    let app_fn = crate::app::App.clone();
                    let res_options = res_options.clone();
                    move || {
                        provide_contexts(&url, res_options);
                        (app_fn)().into_view()
                    }
                };
                render_view_into_response_stm(app, &conf, resp_out).await;
            },
            mode => panic!("oh no mode = {mode:?} what does it mean")
        }
    }

}

async fn render_view_into_response_stm(app: impl FnOnce() -> leptos::View + 'static, conf: &leptos::leptos_config::ConfFile, resp_out: ResponseOutparam) {
    let leptos_opts = &conf.leptos_options;
    let resp_opts = crate::spleppy::ResponseOptions::default();

    let (stm, runtime) = leptos::leptos_dom::ssr::render_to_stream_with_prefix_undisposed_with_context_and_block_replacement(
        app,
        move || {
            let (_h, b) = leptos_meta::generate_head_metadata_separated();
            b.into()
        },
        || {},
        false);
    let mut stm2 = Box::pin(stm);

    let first_app_chunk = stm2.next().await.unwrap_or_default();
    let (head, tail) = leptos_integration_utils::html_parts_separated(&leptos_opts, leptos::use_context::<leptos_meta::MetaContext>().as_ref());

    let mut stm3 = Box::pin(futures::stream::once(async move { head.clone() })
        .chain(futures::stream::once(async move { first_app_chunk })
            .chain(stm2)
        )
        .map(|html| html.into_bytes()));

    let first_chunk = stm3.next().await;
    let second_chunk = stm3.next().await;

    let status_code = resp_opts.status().unwrap_or(200);
    // TODO: and headers
    let headers = Headers::new(&[("content-type".to_owned(), "text/html".into())]);

    let og = OutgoingResponse::new(status_code, &headers);
    let mut ogbod = og.take_body();
    resp_out.set(og);

    let mut stm4 = Box::pin(futures::stream::iter([first_chunk.unwrap(), second_chunk.unwrap()])
        .chain(stm3)
        .chain(futures::stream::once(async move {
            runtime.dispose();
            tail.to_string()
        }).map(|html| html.into_bytes())));

    while let Some(ch) = stm4.next().await {
        ogbod.send(ch).await.unwrap();
    }

}

async fn handle_server_fns(req: IncomingRequest, resp_out: ResponseOutparam) {
    let pq = req.path_with_query().unwrap_or_default();
    let url = url::Url::parse(&req.uri()).unwrap();
    let mut path_segs = url.path_segments().unwrap().collect::<Vec<_>>();

    let payload = loop {
        if path_segs.is_empty() {
            panic!("NO LEPTOS FN!  Ran out of path segs looking for a match");
        }

        let candidate = path_segs.join("/");

        if let Some(lepfn) = leptos::leptos_server::server_fn_by_path(&candidate) {
            // TODO: better checking here
            if pq.starts_with(lepfn.prefix()) {
                let bod = req.into_body().await.unwrap();
                break lepfn.call((), &bod).await.unwrap();
            }
        }

        path_segs.remove(0);
    };

    let plbytes = match payload {
        leptos::server_fn::Payload::Binary(b) => b,
        leptos::server_fn::Payload::Json(s) => s.into_bytes(),
        leptos::server_fn::Payload::Url(u) => u.into_bytes(),
    };

    let og = OutgoingResponse::new(200, &Headers::new(&[]));
    let mut ogbod = og.take_body();
    resp_out.set(og);
    ogbod.send(plbytes).await.unwrap();
}

pub fn generate_route_list<IV>(
    app_fn: impl Fn() -> IV + 'static + Clone,
) -> Vec<leptos_router::RouteListing>
where
    IV: leptos::IntoView + 'static,
{
    let (routes, _static_data_map) =
        leptos_router::generate_route_list_inner(app_fn);

    let routes2 = routes.into_iter()
        .map(empty_to_slash)
        .map(leptos_wildcards_to_spin)
        .collect::<Vec<_>>();

    if routes2.is_empty() {
        vec![RouteListing::new(
            "/",
            "",
            Default::default(),
            [leptos_router::Method::Get],
            None,
        )]
    } else {
        // TODO: the actix one has something about excluded routes
        routes2
    }
}

fn empty_to_slash(listing: RouteListing) -> RouteListing {
    let path = listing.path();
    if path.is_empty() {
        return RouteListing::new("/", listing.path(), listing.mode(), listing.methods(), listing.static_mode());
    }
    listing  // ?
}

fn leptos_wildcards_to_spin(listing: RouteListing) -> RouteListing {
    // TODO: wildcards, parameters, etc etc etc.
    let path = listing.path();
    let path2 = path.replace("*any", "*");
    RouteListing::new(path2, listing.path(), listing.mode(), listing.methods(), listing.static_mode())
}

// since we control `generate_route_list` maybe we don't need this?
fn _method_to_sdk(method: leptos_router::Method) -> spin_sdk::http::Method {
    match method {
        leptos_router::Method::Get => spin_sdk::http::Method::Get,
        leptos_router::Method::Post => spin_sdk::http::Method::Post,
        leptos_router::Method::Put => spin_sdk::http::Method::Put,
        leptos_router::Method::Delete => spin_sdk::http::Method::Delete,
        leptos_router::Method::Patch => spin_sdk::http::Method::Patch,
    }
}

// fn app_to_sdk<IV>(_app_fn: impl Fn() -> IV + Clone + Send + 'static) -> impl Fn(spin_sdk::http::Request, spin_sdk::http::Params) -> spin_sdk::http::Response
// where IV: leptos::IntoView + 'static, 
// {
//     |_r, _p| spin_sdk::http::responses::internal_server_error()
// }

fn provide_contexts(url: &url::Url, res_options: crate::spleppy::ResponseOptions) {
    use leptos::provide_context;

    let path = leptos_corrected_path(url);

    let integration = leptos_router::ServerIntegration { path };
    provide_context(leptos_router::RouterIntegrationContext::new(integration));
    provide_context(leptos_meta::MetaContext::new());
    provide_context(res_options);
    // provide_context(req.clone());  // TODO: this feels like it could be bad
    // leptos_router::provide_server_redirect(redirect);
    #[cfg(feature = "nonce")]
    leptos::nonce::provide_nonce();
}

// I dunno, copied from the actix generated code and without it
// leptos panics somewhere deep within
fn leptos_corrected_path(req: &url::Url) -> String {
    let path = req.path();
    let query = req.query();
    if query.unwrap_or_default().is_empty() {
        "http://leptos".to_string() + path
    } else {
        "http://leptos".to_string() + path + "?" + query.unwrap_or_default()
    }
}
