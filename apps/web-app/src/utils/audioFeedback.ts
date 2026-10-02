/**
 * Audio feedback utility using pure Web Audio API.
 * Synthesizes authentic messaging sound cues without external asset files or dependencies.
 */

export function playWhatsAppSendSound(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(560, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.1)

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.1)
  } catch {
    // AudioContext blocked by browser autoplay policy or not supported
  }
}

export function playWhatsAppReceiveSound(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    const now = ctx.currentTime

    const osc1 = ctx.createOscillator()
    const osc2 = ctx.createOscillator()
    const gain = ctx.createGain()

    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(660, now)

    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, now + 0.08)

    gain.gain.setValueAtTime(0.15, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26)

    osc1.connect(gain)
    osc2.connect(gain)
    gain.connect(ctx.destination)

    osc1.start(now)
    osc1.stop(now + 0.08)

    osc2.start(now + 0.08)
    osc2.stop(now + 0.26)
  } catch {
    // AudioContext blocked by browser autoplay policy or not supported
  }
}
