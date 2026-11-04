/**
 * Reading the question aloud helps a child who does not read yet. Only voices installed ON the device
 * (`localService`) are used: some browsers offer voices that run on a remote server, and nothing
 * should leave the device.
 */
function frenchLocalVoice(): SpeechSynthesisVoice | undefined {
    try {
        return speechSynthesis.getVoices().find(v => v.localService && v.lang.toLowerCase().startsWith('fr'));
    } catch {
        return undefined;
    }
}

export const canSpeak = (): boolean => typeof speechSynthesis !== 'undefined' && !!frenchLocalVoice();

export function speak(text: string): void {
    const voice = frenchLocalVoice();
    if (!voice) return;
    try {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text.replace(/[«»]/g, ''));
        utterance.voice = voice;
        utterance.lang = voice.lang;
        utterance.rate = 0.92;
        speechSynthesis.speak(utterance);
    } catch {
        /* Speech is a bonus. */
    }
}

export function onVoices(callback: () => void): void {
    try {
        speechSynthesis.addEventListener('voiceschanged', callback);
    } catch {
        /* No speech on this device. */
    }
}
