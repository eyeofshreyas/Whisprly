#!/usr/bin/env bash
# =============================================================================
# WisperFlow — Linux Setup Script (Ubuntu / Debian)
# =============================================================================
# Run this once after cloning the repo:
#   chmod +x scripts/install-linux-deps.sh
#   ./scripts/install-linux-deps.sh
# =============================================================================

set -euo pipefail

BOLD="\033[1m"
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
RED="\033[0;31m"
RESET="\033[0m"

log()  { echo -e "${BOLD}▶ $*${RESET}"; }
ok()   { echo -e "${GREEN}✔ $*${RESET}"; }
warn() { echo -e "${YELLOW}⚠ $*${RESET}"; }
fail() { echo -e "${RED}✘ $*${RESET}"; exit 1; }

# ── 0. Detect distro ──────────────────────────────────────────────────────────

if [ -f /etc/os-release ]; then
    . /etc/os-release
    DISTRO="$ID"
else
    DISTRO="unknown"
fi

log "Detected distro: $DISTRO"

# ── 1. System packages ────────────────────────────────────────────────────────

log "Installing system dependencies..."

if [[ "$DISTRO" == "ubuntu" || "$DISTRO" == "debian" || "$DISTRO" == "linuxmint" ]]; then
    sudo apt-get update -qq
    sudo apt-get install -y \
        libwebkit2gtk-4.1-dev \
        libgtk-3-dev \
        libssl-dev \
        libayatana-appindicator3-dev \
        librsvg2-dev \
        libxdo-dev \
        libasound2-dev \
        libudev-dev \
        pkg-config \
        build-essential \
        curl \
        wget \
        file \
        python3 \
        python3-pip \
        python3-venv \
        xdotool \
        wl-clipboard
    ok "System packages installed."

elif [[ "$DISTRO" == "fedora" || "$DISTRO" == "rhel" || "$DISTRO" == "centos" ]]; then
    sudo dnf install -y \
        webkit2gtk4.1-devel \
        gtk3-devel \
        openssl-devel \
        libappindicator-gtk3-devel \
        librsvg2-devel \
        libxdo-devel \
        alsa-lib-devel \
        libudev-devel \
        pkgconf \
        gcc \
        python3 \
        python3-pip \
        xdotool \
        wl-clipboard
    ok "System packages installed (Fedora/RHEL)."

elif [[ "$DISTRO" == "arch" || "$DISTRO" == "manjaro" ]]; then
    sudo pacman -Syu --noconfirm \
        webkit2gtk-4.1 \
        gtk3 \
        openssl \
        libappindicator-gtk3 \
        librsvg \
        xdotool \
        alsa-lib \
        systemd-libs \
        python \
        python-pip \
        wl-clipboard
    ok "System packages installed (Arch)."

else
    warn "Unknown distro '$DISTRO'. Please install system packages manually."
    warn "Required: webkit2gtk, gtk3, openssl, alsa-lib, xdotool, wl-clipboard, python3"
fi

# ── 2. Rust toolchain ─────────────────────────────────────────────────────────

if ! command -v cargo &>/dev/null; then
    log "Installing Rust toolchain..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable
    # shellcheck source=/dev/null
    source "$HOME/.cargo/env"
    ok "Rust installed."
else
    ok "Rust already installed: $(rustc --version)"
fi

# ── 3. Node.js dependencies ───────────────────────────────────────────────────

if ! command -v npm &>/dev/null; then
    fail "npm not found. Please install Node.js >= 18 from https://nodejs.org"
fi

log "Installing Node.js dependencies..."
npm install
ok "Node.js dependencies installed."

# ── 4. Python sidecar venv ───────────────────────────────────────────────────

log "Setting up Python sidecar venv..."

if [ ! -d "sidecar/.venv" ]; then
    python3 -m venv sidecar/.venv
    ok "Created sidecar/.venv"
fi

log "Installing Python packages (faster-whisper)..."
sidecar/.venv/bin/pip install --upgrade pip -q
sidecar/.venv/bin/pip install -r sidecar/requirements.txt
ok "Python sidecar ready."

# ── 5. Input group (for global hotkeys) ──────────────────────────────────────

log "Configuring input group for global hotkey access..."

if groups | grep -qw input; then
    ok "User is already in the 'input' group."
else
    sudo usermod -aG input "$USER"
    warn "Added $USER to the 'input' group."
    warn "You MUST log out and log back in for hotkeys to work!"
fi

# ── 6. udev rule ─────────────────────────────────────────────────────────────

RULES_SRC="scripts/99-wisperflow-input.rules"
RULES_DST="/etc/udev/rules.d/99-wisperflow-input.rules"

if [ -f "$RULES_SRC" ]; then
    log "Installing udev input rule..."
    sudo cp "$RULES_SRC" "$RULES_DST"
    sudo udevadm control --reload-rules
    ok "udev rule installed at $RULES_DST"
fi

# ── 7. ydotool (optional, Wayland native auto-type) ──────────────────────────

SESSION="${XDG_SESSION_TYPE:-unknown}"
if [[ "$SESSION" == "wayland" ]]; then
    log "Wayland detected — checking ydotool..."
    if ! command -v ydotool &>/dev/null; then
        warn "ydotool not found. Installing from source (optional Wayland auto-type)..."
        if command -v apt-get &>/dev/null; then
            # Try apt first (available on Ubuntu 23.04+)
            sudo apt-get install -y ydotool 2>/dev/null || \
                warn "ydotool not in apt. Auto-type will fall back to xdotool via XWayland."
        fi
    else
        ok "ydotool is available."
        warn "To enable ydotool, start the daemon: sudo ydotoold &"
        warn "Or add it to your systemd user services for auto-start."
    fi
fi

# ── 8. Summary ────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}════════════════════════════════════════${RESET}"
echo -e "${GREEN}${BOLD}  WisperFlow Linux setup complete!${RESET}"
echo -e "${BOLD}════════════════════════════════════════${RESET}"
echo ""
echo "  Dev mode:    npm run tauri dev"
echo "  Build:       npm run tauri build"
echo "  Output:      src-tauri/target/release/bundle/"
echo ""
if ! groups | grep -qw input; then
    echo -e "${YELLOW}  ⚠ ACTION REQUIRED: Log out and back in for hotkeys to work!${RESET}"
fi
echo ""
