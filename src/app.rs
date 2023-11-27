use leptos::*;
use leptos_meta::*;
use leptos_router::*;

#[component]
pub fn App() -> impl IntoView {
    // Provides context that manages stylesheets, titles, meta tags, etc.
    provide_meta_context();

    // Okay so we are obeying the Router I think but the Stylesheet and Title are NOT
    // getting run.  WHY NOT
    view! {
        // injects a stylesheet into the document <head>
        // id=leptos means cargo-leptos will hot-reload this stylesheet
        <Stylesheet id="leptos" href="/pkg/what_could_go_wrong.css"/>

        // sets the document title
        <Title text="Welcome to Leptos"/>

        // content for this welcome page
        <Router>
            <main>
                <Routes>
                    <Route path="" view=|| { view! { <HomePage/> } } />
                    <Route path="/*any" view=NotFound/>
                </Routes>
            </main>
        </Router>
    }
}

/// Renders the home page of your application.
#[component]
fn HomePage() -> impl IntoView {
    // let init = get_server_count().await.unwrap();  // NO await IN SYNC FN

    let dec = create_action(|_| adjust_server_count(-1, "decing".into()));
    let inc = create_action(|_| adjust_server_count(1, "incing".into()));
    // let clear = create_action(|_| clear_server_count());
    let counter = create_resource(
        move || {
            (
                dec.version().get(),
                inc.version().get(),
                // clear.version().get(),
            )
        },
        |_| get_server_count(),
    );

    let value =
        move || counter.get().map(|count| count.unwrap_or(0)).unwrap_or(0);

    // Creates a reactive value to update the button
    // let (count, set_count) = create_signal(0);
    let on_incr_click = move |_| {
        request_animation_frame(move || { // !!! REQUEST_ANIMATION_FRAME IS VERY IMPORTANT !!! at least for now
            spawn_local(async move {
                inc.dispatch(())
            });
            // set_count.update(|count| *count += 1);
            // spawn_local(async move {
            //     save_count(count.get()).await.unwrap(); // YOLO
            // });
        });
    };
    let on_decr_click = move |_| {
        request_animation_frame(move || { // !!! REQUEST_ANIMATION_FRAME IS VERY IMPORTANT !!! at least for now
            spawn_local(async move {
                dec.dispatch(())
            });
            // set_count.update(|count| *count += 1);
            // spawn_local(async move {
            //     let new = adjust_server_count(-1, "decring".to_string()).await.unwrap();
            //     set_count.update(|count| *count = new);
            // });
        });
    };

    view! {
        <h1>"The value is " {value}</h1>
        <button on:click=on_incr_click>"Incr"</button>
        <button on:click=on_decr_click>"Decr"</button>
    }
}

/// 404 - Not Found
#[component]
fn NotFound() -> impl IntoView {
    // set an HTTP status code 404
    // this is feature gated because it can only be done during
    // initial server-side rendering
    // if you navigate to the 404 page subsequently, the status
    // code will not be set because there is not a new HTTP request
    // to the server
    #[cfg(feature = "ssr")]
    {
        // this can be done inline because it's synchronous
        // if it were async, we'd use a server function
        let resp = expect_context::<crate::spleppy::ResponseOptions>();
        resp.set_status(404);
    }

    view! {
        <h1>"Not Found"</h1>
    }
}

#[cfg(feature = "ssr")]
const COUNT_KEY: &'static str = "THE COUNT AH HA HA HA";

#[server(SaveCount, "/api")]
pub async fn save_count(count: i32) -> Result<(), ServerFnError> {
    println!("SAVING {count}");
    let st = spin_sdk::key_value::Store::open_default()?;
    st.set_json(COUNT_KEY, &count).map_err(|e| ServerFnError::ServerError(e.to_string()))?;
    Ok(())
}

#[server(GetServerCount, "/api")]
pub async fn get_server_count() -> Result<i32, ServerFnError> {
    // let st = spin_sdk::key_value::Store::open_default()?;
    // let count: i32 = st.get_json(COUNT_KEY).map_err(|e| ServerFnError::ServerError(e.to_string()))?.unwrap_or_default();
    let request = spin_sdk::http::Request::builder().uri("https://google.co.nz").build();
    let resp: spin_sdk::http::Response = spin_sdk::http::send(request).await.unwrap();
    let bodlen = resp.body().len().try_into().unwrap();
    Ok(bodlen)
}

#[server(AdjustServerCount, "/api")]
pub async fn adjust_server_count(
    delta: i32,
    msg: String,
) -> Result<i32, ServerFnError> {
    let st = spin_sdk::key_value::Store::open_default()?;
    let count: i32 = st.get_json(COUNT_KEY).map_err(|e| ServerFnError::ServerError(e.to_string()))?.unwrap_or_default();
    let new = count + delta;
    st.set_json(COUNT_KEY, &new).map_err(|e| ServerFnError::ServerError(e.to_string()))?;
    // _ = COUNT_CHANNEL.send(&new).await;
    println!("message = {:?}", msg);
    Ok(new)
}

#[server(ClearServerCount, "/api")]
pub async fn clear_server_count() -> Result<i32, ServerFnError> {
    let st = spin_sdk::key_value::Store::open_default()?;
    st.set_json(COUNT_KEY, &0).map_err(|e| ServerFnError::ServerError(e.to_string()))?;
    Ok(0)
}
