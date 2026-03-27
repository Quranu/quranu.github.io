export class AudioController {
  constructor() {
    this.audio = new Audio();
    this.activeButton = null;
    this.activeUrl = null;
    this.labels = {
      play: "Play audio",
      pause: "Pause audio",
    };

    this.audio.addEventListener("ended", () => this.reset());
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

    this.labels = labels ?? this.labels;

    if (this.activeUrl === url && !this.audio.paused) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.reset();
      return;
    }

    this.audio.pause();
    this.audio.currentTime = 0;

    this.activeUrl = url;
    this.activeButton = button;
    this.audio.src = url;

    try {
      await this.audio.play();
      this.syncButtonState(true);
    } catch (error) {
      console.error("Audio playback failed", error);
      this.reset();
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
    this.activeUrl = null;
    this.activeButton = null;
    this.audio.removeAttribute("src");
  }

  syncButtonState(isPlaying) {
    if (!this.activeButton) {
      return;
    }

    this.activeButton.classList.toggle("is-playing", isPlaying);
    this.activeButton.textContent = isPlaying ? this.labels.pause : this.labels.play;
    this.activeButton.setAttribute("aria-pressed", String(isPlaying));
  }
}
