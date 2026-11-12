// Tanpa jendela konsol tambahan di Windows (rilis). JANGAN DIHAPUS.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    rave_desktop_lib::run()
}
