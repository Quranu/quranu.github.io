export class AudioController {
  constructor() {
    this.audio = new Audio();
    this.activeButton = null;
    this.activeUrl = null;
    this.activeKey = null;
    this.labels = {};

    this.audio.addEventListener("ended", () => this.reset());
    this.audio.addEventListener("error", () => this.handleError());
    this.audio.addEventListener("pause", () => {
      if (this.audio.currentTime === 0 || this.audio.ended) {
        this.reset();
      } else {
        this.syncButtonState(false);
      }
    });
  }

  async toggle(url, button, labels) {
    if (!url) {
      return;
    }

    this.labels = labels ?? {};
    const audioKey = button.dataset.audioKey ?? url;

    if (this.activeKey === audioKey && !this.audio.paused) {
      this.audio.pause();
      return;
    }

    if (this.activeKey === audioKey && this.audio.paused) {
      this.activeButton = button;
      try {
        await this.audio.play();
        this.syncButtonState(true);
      } catch (error) {
        console.error("Audio playback failed", error);
        this.handleError();
      }
      return;
    }

    this.audio.pause();
    if (this.activeKey && this.activeKey !== audioKey) {
      this.audio.currentTime = 0;
    }

    this.activeKey = audioKey;
    this.activeUrl = url;
    this.activeButton = button;
    if (this.audio.src !== new URL(url, window.location.href).href) {
      this.audio.src = url;
    }

    try {
      this.audio.currentTime = 0;
      await this.audio.play();
      this.syncButtonState(true);
    } catch (error) {
      console.error("Audio playback failed", error);
      this.handleError();
    }
  }

  stop(labels) {
    this.labels = labels ?? this.labels;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.reset();
  }

  reset() {
    this.syncButtonState(false);
    this.activeKey = null;
    this.activeUrl = null;
    this.activeButton = null;
    this.audio.removeAttribute("src");
  }

  syncButtonState(isPlaying) {
    if (!this.activeButton) {
      return;
    }

    const reference = this.activeButton.dataset.audioReference ?? "";
    this.activeButton.classList.toggle("is-playing", isPlaying);
    this.activeButton.classList.remove("has-error");
    this.activeButton.innerHTML = isPlaying ? this.labels.pauseIcon ?? "" : this.labels.playIcon ?? "";
    this.activeButton.setAttribute("aria-pressed", String(isPlaying));
    this.activeButton.setAttribute(
      "aria-label",
      isPlaying
        ? this.labels.pauseLabel ?? `Stop audio for ${reference}`
        : this.labels.playLabel ?? `Play audio for ${reference}`,
    );
    this.activeButton.title = isPlaying
      ? this.labels.pauseLabel ?? `Stop audio for ${reference}`
      : this.labels.playLabel ?? `Play audio for ${reference}`;
    this.activeButton.disabled = false;
  }

  handleError() {
    if (!this.activeButton) {
      return;
    }

    this.activeButton.classList.remove("is-playing");
    this.activeButton.classList.add("has-error");
    this.activeButton.innerHTML = this.labels.errorIcon ?? this.labels.playIcon ?? "";
    this.activeButton.setAttribute("aria-pressed", "false");
    this.activeButton.setAttribute(
      "aria-label",
      this.labels.errorLabel ?? "Audio failed to load",
    );
    this.activeButton.title = this.labels.errorLabel ?? "Audio failed to load";
    this.activeButton.disabled = true;

    this.activeUrl = null;
    this.activeKey = null;
    this.activeButton = null;
    this.audio.removeAttribute("src");
  }
}
