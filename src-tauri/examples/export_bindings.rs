use std::{env, fs, path::PathBuf};

use specta_typescript::Typescript;

fn normalized(content: &str) -> String {
    format!("{}\n", content.trim_end())
}

fn main() {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let target = manifest_dir.join("../src/shared/lib/tauri-client/bindings.ts");
    let check = env::args().any(|argument| argument == "--check");
    let temporary = tempfile::tempdir().expect("create bindings generation directory");
    let generated = temporary.path().join("bindings.ts");
    u_frame_lib::specta_builder()
        .export(Typescript::default(), &generated)
        .expect("generate TypeScript bindings");
    let actual =
        normalized(&fs::read_to_string(&generated).expect("read generated TypeScript bindings"));

    if check {
        let expected = fs::read_to_string(&target).expect("read committed TypeScript bindings");
        if expected != actual {
            eprintln!("TypeScript bindings are stale. Run `pnpm bindings:generate`.");
            std::process::exit(1);
        }
        println!("TypeScript bindings are current.");
    } else {
        fs::create_dir_all(target.parent().expect("bindings parent"))
            .expect("create bindings directory");
        fs::write(&target, actual).expect("write normalized TypeScript bindings");
        println!("Generated {}", target.display());
    }
}
