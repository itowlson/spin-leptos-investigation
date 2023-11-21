use leptos::ServerFn;
use spin_sdk::http::{ResponseOutparam, IncomingRequest};
use spin_sdk::http_component;
use crate::spleppy::{build_route_table, render_best_match_to_stream};

#[http_component]
async fn handle_what_could_go_wrong(req: IncomingRequest, resp_out: ResponseOutparam) {
    let mut conf = leptos::get_configuration(None).await.unwrap();
    conf.leptos_options.output_name = "what_could_go_wrong".to_owned();

    crate::app::SaveCount::register_explicit().unwrap();

    let app_fn = crate::app::App;

    let mut rf = build_route_table(app_fn);
    // TODO: this should maybe be using the prefix stuff???
    rf.add("/api/*", None).unwrap();

    render_best_match_to_stream(req, resp_out, &rf, app_fn, &conf.leptos_options).await
}
