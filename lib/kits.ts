import * as Tone from "tone";

export const KITS = {
  "Default": {
    "Kick": {
      "type": "MembraneSynth",
      "options": {
        "pitchDecay": 0.05,
        "octaves": 10,
        "oscillator": {
          "type": "sine"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.4,
          "sustain": 0.01,
          "release": 1.4,
          "attackCurve": "exponential"
        }
      }
    },
    "Snare": {
      "type": "NoiseSynth",
      "options": {
        "noise": {
          "type": "white",
          "playbackRate": 2
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.2,
          "sustain": 0.1,
          "release": 0.1
        }
      }
    },
    "Hi-hat": {
      "type": "NoiseSynth",
      "options": {
        "noise": {
          "type": "white",
          "playbackRate": 1
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.1,
          "sustain": 0.01,
          "release": 0.03
        }
      }
    },
    "Clap": {
      "type": "NoiseSynth",
      "options": {
        "noise": {
          "type": "pink",
          "playbackRate": 0.5
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.05,
          "sustain": 0.3,
          "release": 0.1
        }
      }
    },
    "Tom": {
      "type": "MembraneSynth",
      "options": {
        "pitchDecay": 0.008,
        "octaves": 4,
        "oscillator": {
          "type": "sine"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.5,
          "sustain": 0.01,
          "release": 1,
          "attackCurve": "exponential"
        }
      }
    }
  },
  "606": {
    "Kick": {
      "type": "MembraneSynth",
      "options": {
        "pitchDecay": 0.02,
        "octaves": 6,
        "oscillator": {
          "type": "sine"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.2,
          "sustain": 0.01,
          "release": 0.8,
          "attackCurve": "exponential"
        }
      }
    },
    "Snare": {
      "type": "NoiseSynth",
      "options": {
        "noise": {
          "type": "white"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.1,
          "sustain": 0.01,
          "release": 0.1
        }
      }
    },
    "Hi-hat": {
      "type": "MetalSynth",
      "options": {
        "frequency": 250,
        "envelope": {
          "attack": 0.001,
          "decay": 0.2,
          "release": 0.1
        },
        "harmonicity": 5.1,
        "modulationIndex": 32,
        "resonance": 4000,
        "octaves": 1.5
      }
    },
    "Clap": {
      "type": "NoiseSynth",
      "options": {
        "noise": {
          "type": "white"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.05,
          "sustain": 0.1,
          "release": 0.1
        }
      }
    },
    "Tom": {
      "type": "MembraneSynth",
      "options": {
        "pitchDecay": 0.01,
        "octaves": 3,
        "oscillator": {
          "type": "sine"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.3,
          "sustain": 0.01,
          "release": 0.8,
          "attackCurve": "exponential"
        }
      }
    }
  },
  "808": {
    "Kick": {
      "type": "MembraneSynth",
      "options": {
        "pitchDecay": 0.05,
        "octaves": 10,
        "oscillator": {
          "type": "sine"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.4,
          "sustain": 0.01,
          "release": 1.4,
          "attackCurve": "exponential"
        }
      }
    },
    "Snare": {
      "type": "NoiseSynth",
      "options": {
        "noise": {
          "type": "white"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.2,
          "sustain": 0,
          "release": 0.1
        }
      }
    },
    "Hi-hat": {
      "type": "MetalSynth",
      "options": {
        "frequency": 200,
        "envelope": {
          "attack": 0.001,
          "decay": 0.1,
          "release": 0.05
        },
        "harmonicity": 5.1,
        "modulationIndex": 32,
        "resonance": 4000,
        "octaves": 1.5
      }
    },
    "Clap": {
      "type": "NoiseSynth",
      "options": {
        "noise": {
          "type": "white"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.1,
          "sustain": 0,
          "release": 0.1
        }
      }
    },
    "Tom": {
      "type": "MembraneSynth",
      "options": {
        "pitchDecay": 0.05,
        "octaves": 10,
        "oscillator": {
          "type": "sine"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.4,
          "sustain": 0.01,
          "release": 1.4,
          "attackCurve": "exponential"
        }
      }
    }
  },
  "909": {
    "Kick": {
      "type": "MembraneSynth",
      "options": {
        "pitchDecay": 0.01,
        "octaves": 6,
        "oscillator": {
          "type": "sine"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.2,
          "sustain": 0.01,
          "release": 0.8,
          "attackCurve": "exponential"
        }
      }
    },
    "Snare": {
      "type": "NoiseSynth",
      "options": {
        "noise": {
          "type": "white"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.1,
          "sustain": 0,
          "release": 0.1
        }
      }
    },
    "Hi-hat": {
      "type": "MetalSynth",
      "options": {
        "frequency": 250,
        "envelope": {
          "attack": 0.001,
          "decay": 0.05,
          "release": 0.05
        },
        "harmonicity": 5.1,
        "modulationIndex": 32,
        "resonance": 4000,
        "octaves": 1.5
      }
    },
    "Clap": {
      "type": "NoiseSynth",
      "options": {
        "noise": {
          "type": "white"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.1,
          "sustain": 0,
          "release": 0.1
        }
      }
    },
    "Tom": {
      "type": "MembraneSynth",
      "options": {
        "pitchDecay": 0.01,
        "octaves": 6,
        "oscillator": {
          "type": "sine"
        },
        "envelope": {
          "attack": 0.001,
          "decay": 0.2,
          "sustain": 0.01,
          "release": 0.8,
          "attackCurve": "exponential"
        }
      }
    }
  }
}
