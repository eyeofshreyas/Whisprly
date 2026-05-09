use rdev::Key;

pub const CTRL_KEYS: [Key; 2] = [Key::ControlLeft, Key::ControlRight];
pub const SHIFT_KEYS: [Key; 2] = [Key::ShiftLeft, Key::ShiftRight];
/// Space is the trigger key — press while Ctrl+Shift held to record
pub const TRIGGER_KEY: Key = Key::Space;

/// Returns true if the current user can read /dev/input/event0.
/// rdev/evdev requires this; users need to be in the `input` group.
pub fn input_group_ok() -> bool {
    std::fs::metadata("/dev/input/event0")
        .map(|_| std::fs::File::open("/dev/input/event0").is_ok())
        .unwrap_or(false)
}
