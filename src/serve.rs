use leptos::IntoView;
use leptos_router::RouteListing;
// use spin_sdk::http::conversions::TryFromRequest;
use spin_sdk::http::{IntoResponse, ResponseOutparam, IncomingRequest, OutgoingResponse, Headers};
use spin_sdk::http_component;
use futures::StreamExt;
use futures::SinkExt;
// use crate::app;

#[http_component]
async fn handle_what_could_go_wrong(req: IncomingRequest, resp_out: ResponseOutparam) {
    // let site_root = "http://localhost:3031/";
    let mut conf = leptos::get_configuration(None).await.unwrap();
    conf.leptos_options.output_name = "what_could_go_wrong".to_owned();

    println!("CONF: {:?}", conf);
    // leptos::provide_context(resp_opts.clone());  // this panics. I am not sure where we set up this context thing

    let routes = generate_route_list(crate::app::App);

    let mut router = spin_sdk::http::Router::new();
    router.any("/api/*", handle_server_fns);

    let url = url::Url::parse(&req.uri()).unwrap();
    let path = url.path();

    // TODO: We don't really want to create closures for _all_ the routes at run time.
    // We want to find the _best_ route and run the handler for that.
    let mut rf = routefinder::Router::new();
    for listing in routes{
        let path = listing.path().to_owned();
        rf.add(path, listing).unwrap();
    }

    // TODO: do we need to provide fallback to next best match if method does not match?  Probably
    let best_listing = rf.best_match(path).unwrap();
    // TODO: ensure req.method() is acceptable

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
                    println!("!!!! doing the app_fn dance");
                    let app_fn = crate::app::App.clone();
                    let res_options = res_options.clone();
                    move || {
                        println!("!!!! providing contexts");
                        provide_contexts(&url, res_options);
                        println!("!!!! calling app_fn");
                        let v = (app_fn)().into_view();  // SOMEWHERE IN HERE
                        println!("!!!! called app_fn !!!!");
                        v
                    }
                };
                render_the_shit_out_of_some_mofo(app, &conf, resp_out).await;
            },
            mode => panic!("oh no mode = {mode:?} what does it mean")
        }
    }

}

async fn render_the_shit_out_of_some_mofo(app: impl FnOnce() -> leptos::View + 'static, conf: &leptos::leptos_config::ConfFile, resp_out: ResponseOutparam) {
    let leptos_opts = &conf.leptos_options;
    let resp_opts = crate::spleppy::ResponseOptions::default();

    println!("!!!! calling render_to_string/stream");
    // let html = leptos::leptos_dom::ssr::render_to_string(app).into_owned(); //stream(app);
    let stm = leptos::leptos_dom::ssr::render_to_stream(app);
    let mut stm2 = Box::pin(stm);

    let first_app_chunk = stm2.next().await.unwrap_or_default();
    let (head, tail) = leptos_integration_utils::html_parts_separated(&leptos_opts, leptos::use_context::<leptos_meta::MetaContext>().as_ref());

    println!("!!!! called render_to_string/stream");
    // println!("RES IS {}", html);

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
            // TODO: runtime.dispose()
            tail.to_string()
        }).map(|html| html.into_bytes())));

    while let Some(ch) = stm4.next().await {
        ogbod.send(ch).await.unwrap();
    }

}

fn handle_server_fns(req: spin_sdk::http::Request, params: spin_sdk::http::Params) -> impl IntoResponse {
    println!("HSF PATH: {}", req.path());
    for p in params {
        println!("- PARM: {} = {}", p.name(), p.value());
    }

    if let Some(_lepfn) = leptos::leptos_server::server_fn_by_path(req.path()) {
        println!("- WE HAVE A LEPFN");
    }

    http::Response::builder().status(500).body(()).unwrap()
}

pub fn generate_route_list<IV>(
    app_fn: impl Fn() -> IV + 'static + Clone,
) -> Vec<leptos_router::RouteListing>
where
    IV: leptos::IntoView + 'static,
{
    let (routes, _static_data_map) =
        leptos_router::generate_route_list_inner(app_fn);

    for r in &routes {
        println!("GOTTA ROUTE P={} LP={}", r.path(), r.leptos_path());
    }

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
fn to_sdk(method: leptos_router::Method) -> spin_sdk::http::Method {
    match method {
        leptos_router::Method::Get => spin_sdk::http::Method::Get,
        leptos_router::Method::Post => spin_sdk::http::Method::Post,
        leptos_router::Method::Put => spin_sdk::http::Method::Put,
        leptos_router::Method::Delete => spin_sdk::http::Method::Delete,
        leptos_router::Method::Patch => spin_sdk::http::Method::Patch,
    }
}

fn app_to_sdk<IV>(_app_fn: impl Fn() -> IV + Clone + Send + 'static) -> impl Fn(spin_sdk::http::Request, spin_sdk::http::Params) -> spin_sdk::http::Response
where IV: leptos::IntoView + 'static, 
{
    |_r, _p| spin_sdk::http::responses::internal_server_error()
}

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
