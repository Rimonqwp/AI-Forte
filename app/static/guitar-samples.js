// CC0 nylon guitar recordings, with per-sample pitch calibration.
const GuitarSamples = (() => {
  let bank = null;
  async function load() {
    const [metaResponse, pcmResponse] = await Promise.all([
      fetch('/static/guitar/samples.json'), fetch('/static/guitar/samples.pcm')
    ]);
    if (!metaResponse.ok || !pcmResponse.ok) throw new Error('吉他采样加载失败');
    const [meta, bytes] = await Promise.all([metaResponse.json(), pcmResponse.arrayBuffer()]);
    if (bytes.byteLength % 2 || !meta.sampleRate || !Array.isArray(meta.samples) || !meta.samples.length) throw new Error('吉他采样数据无效');
    const pcm = new Int16Array(bytes), strings = new Map();
    for (const sample of meta.samples) {
      if (!Number.isFinite(sample.frequency) || sample.frequency <= 0 || sample.offset < 0 || sample.length < 2 || sample.offset + sample.length > pcm.length) throw new Error('吉他采样索引无效');
      if (!strings.has(sample.string)) strings.set(sample.string, []);
      strings.get(sample.string).push(sample);
    }
    bank = {sampleRate: meta.sampleRate, pcm, strings};
  }
  function mix(buffer, outputRate, note, end, gain, tuningCents=0, articulation={}) {
    if (!bank || !Number.isFinite(note.pitch) || !Number.isFinite(note.start)) return false;
    const choices = bank.strings.get(note.string);
    if (!choices?.length) return false;
    const sample = choices.reduce((best, candidate) => Math.abs(candidate.pitch-note.pitch) < Math.abs(best.pitch-note.pitch) ? candidate : best);
    if (Math.abs(sample.pitch-note.pitch) > 2) return false;
    const start = Math.max(0, Math.floor(note.start*outputRate));
    const count = Math.max(0, Math.min(buffer.length-start, Math.floor((end-note.start)*outputRate)));
    const frequency = 440 * Math.pow(2, (note.pitch-69+tuningCents/100)/12);
    const step = bank.sampleRate/outputRate * frequency/sample.frequency;
    const release = Math.min(.045, count/outputRate*.35);
    const sampleOffset = articulation.softAttack ? .018*bank.sampleRate : 0;
    const attack = articulation.softAttack ? Math.min(.025, count/outputRate*.3) : 0;
    const slide=articulation.slide;
    let pos=sampleOffset;
    for (let i=0; i<count; i++) {
      const index=Math.floor(pos);
      if (index+1 >= sample.length) break;
      const fraction=pos-index, offset=sample.offset+index;
      const value=(bank.pcm[offset]*(1-fraction)+bank.pcm[offset+1]*fraction)/32768;
      const fade=Math.min(1,(count-i)/(outputRate*release || 1));
      const onset=attack ? Math.min(1,(i+1)/(outputRate*attack)) : 1;
      buffer[start+i]+=value*gain*fade*onset;
      let bend=0;
      if(slide){const t=note.start+i/outputRate; bend=slide.semitones*Math.max(0,Math.min(1,(t-slide.start)/(slide.end-slide.start)));}
      pos+=step*(bend ? Math.pow(2,bend/12) : 1);
    }
    return true;
  }
  return {load, mix, get ready(){return bank !== null;}};
})();
