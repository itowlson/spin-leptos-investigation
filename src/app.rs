use leptos::*;
use leptos_meta::*;
use leptos_router::*;

#[component]
pub fn App() -> impl IntoView {
    println!("HERE WE ARE in the App");
    // Provides context that manages stylesheets, titles, meta tags, etc.
    provide_meta_context();
    println!("with our meta contexts");

    // Okay so we are obeying the Router I think but the Stylesheet and Title are NOT
    // getting run.  WHY NOT
    let v = view! {
        // injects a stylesheet into the document <head>
        // id=leptos means cargo-leptos will hot-reload this stylesheet
        <Stylesheet id="leptos" href="/pkg/what_could_go_wrong.css"/>

        // sets the document title
        <Title text="Welcome to Leptos"/>

        // content for this welcome page
        <Router>
            <main>
                <Routes>
                    <Route path="" view=HomePage/>
                    <Route path="/*any" view=NotFound/>
                </Routes>
            </main>
        </Router>
    };

    println!("After the view! macro");

    v
}

/// Renders the home page of your application.
#[component]
fn HomePage() -> impl IntoView {
    println!("HERE WE ARE in the HomePage");
    // Creates a reactive value to update the button
    let (count, set_count) = create_signal(0);
    let on_click = move |_| {
        set_count.update(|count| *count += 1);
        spawn_local(async move {
            save_count(count.get()).await.unwrap(); // YOLO
        });

    };

    println!("about to call HomePage view!");
    view! {
        <h1>"Welcome to Leptos!"</h1>
        <button on:click=on_click>"Click Me: " {count}</button>
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

#[server(SaveCount, "/api")]
pub async fn save_count(count: u32) -> Result<(), ServerFnError> {
    use std::io::Write;
    println!("SAVING {count}");
    let mut wr = std::fs::File::create("PLOPPLES.txt")?;
    write!(wr, "{count}")?;
    Ok(())
}
