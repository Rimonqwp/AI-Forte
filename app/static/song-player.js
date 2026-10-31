/* Rolling scheduling: bounded note buffers, never a whole-song PCM allocation. */
(function(root){
  class SongPlayer{
    constructor(update){this.update=update;this.nodes=new Set();this.timer=null;this.position=0;this.duration=0;this.events=[];this.tone='sample';}
    set(events,duration,slides=[]){this.pause();this.events=events;this.duration=duration;this.slides=slides;}
    now(){return this.timer?Math.min(this.duration,this.position+this.context.currentTime-this.started):this.position;}
    seek(t){const playing=!!this.timer;this.pause();this.position=Math.max(0,Math.min(this.duration,t));this.update(this.position);if(playing)this.play();}
    pause(){if(this.timer){this.position=this.now();clearInterval(this.timer);this.timer=null;}for(const n of this.nodes){try{n.stop();}catch{}}this.nodes.clear();}
    async play(){this.pause();this.context??=new AudioContext();await this.context.resume();if(this.position>=this.duration)this.position=0;this.started=this.context.currentTime;this.cursor=this.events.findIndex(n=>n.start>=this.position);if(this.cursor<0)this.cursor=this.events.length;
      // Rebuild ringing voices at seeks using offsets into their bounded buffers.
      for(const n of this.events)if(n.start<this.position&&n.play_end>this.position)this.schedule(n,this.position-n.start);
      const tick=()=>{const t=this.now();while(this.cursor<this.events.length&&this.events[this.cursor].start<t+.35)this.schedule(this.events[this.cursor++]);this.update(t);if(t>=this.duration)this.pause();};
      this.timer=setInterval(tick,80);tick();}
    schedule(note,offset=0){
      const end=note.play_end??note.end,seconds=Math.min(12,Math.max(.01,end-note.start));if(offset>=seconds)return;
      const sr=this.context.sampleRate,pcm=new Float32Array(Math.ceil(seconds*sr));
      // Sung melody rings over accompaniment that steps back beneath it.
      const gain=(note.role==='bass'?.18:note.role==='fill'?.12:note.accent?.46:.38)*(note.under_vocal?.7:1);
      const slide=note.slide?{...note.slide,start:note.slide.start-note.start,end:note.slide.end-note.start}:null;
      const local={...note,start:0};
      if(this.tone!=='sample'||!GuitarSamples.mix(pcm,sr,local,seconds,gain,0,{slide,softAttack:note.softAttack})){
        let phase=0;for(let i=0;i<pcm.length;i++){const t=i/sr,bend=slide?slide.semitones*Math.max(0,Math.min(1,(t-slide.start)/(slide.end-slide.start))):0;phase+=2*Math.PI*440*2**((note.pitch-69+bend)/12)/sr;pcm[i]=(Math.sin(phase)+.3*Math.sin(phase*2))*Math.exp(-t*1.6)*Math.min(1,t/.008)*Math.min(1,(seconds-t)/.04)*gain;}}
      const buffer=this.context.createBuffer(1,pcm.length,sr);buffer.copyToChannel(pcm,0);const node=this.context.createBufferSource();node.buffer=buffer;node.connect(this.context.destination);this.nodes.add(node);node.onended=()=>this.nodes.delete(node);
      const when=this.started+note.start-this.position+offset;node.start(Math.max(this.context.currentTime,when),offset);}
  }
  root.SongPlayer=SongPlayer;
})(globalThis);
