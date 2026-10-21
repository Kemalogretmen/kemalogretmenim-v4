#!/usr/bin/env python3
"""Render our own sample-free seasonal arrangements (numpy + imageio-ffmpeg).
No recording, soundfont, vocal or third-party accompaniment is used.
Run from repository root. See muzikler/LISANS.md for melody references.
"""
from pathlib import Path
import hashlib, json, subprocess, tempfile, wave
import numpy as np
import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/akvaryum/muzikler'
SR = 32000
rng = np.random.default_rng(20261020)
PITCH = {'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def midi(note):
    if note == '-': return None
    return (int(note[-1])+1)*12 + PITCH[note[0]] + (1 if '#' in note else -1 if 'b' in note else 0)
def sequence(text):
    return [(midi(n.split(':')[0]),float(n.split(':')[1]) if ':' in n else 1.) for n in text.split()]

def tone(note, duration, voice):
    t = np.arange(round(duration*SR))/SR
    f = 440*2**((note-69)/12)
    if voice == 'brass':
        v = sum(np.sin(2*np.pi*f*k*t + .01*np.sin(2*np.pi*4*t))*a for k,a in [(1,1),(2,.3),(3,.14),(4,.07),(5,.025)])
        env = np.minimum(t/.035,1)*np.exp(-t*.55)*np.minimum(np.maximum(duration-t,0)/.09,1)
    elif voice == 'bell':
        v = sum(np.sin(2*np.pi*f*k*t)*a*np.exp(-t*d) for k,a,d in [(1,1,1.8),(2,.4,2.8),(2.76,.1,5),(4,.1,6)])
        env = np.minimum(t/.006,1)*np.minimum(np.maximum(duration-t,0)/.05,1)
    else:
        v = (np.sin(2*np.pi*f*t)+.15*np.sin(4*np.pi*f*t)+.06*np.sin(6*np.pi*f*t))
        env = np.minimum(t/.012,1)*np.exp(-t*(2.5 if voice=='piano' else .5))*np.minimum(np.maximum(duration-t,0)/.08,1)
    return v*env

def render(name, melody, bpm, chords, voice, bells=False):
    beat=60/bpm; total=sum(d for _,d in melody); audio=np.zeros(round((total*beat+1)*SR))
    def put(at, signal, level):
        start=round(at*SR);end=min(len(audio),start+len(signal))
        if end>start: audio[start:end] += signal[:end-start]*level
    at=0
    for note,d in melody:
        if note is not None: put(at*beat,tone(note,d*beat*.94,voice),.25)
        at+=d
    for bar in range(int(np.ceil(total/4))):
        chord=chords[bar%len(chords)]
        for b in range(4):
            when=(bar*4+b)*beat
            bass=chord[0]-24 if b%2==0 else chord[0]-17
            put(when,tone(bass,beat*.78,'warm'),.11)
            if b%2:
                for n in chord: put(when,tone(n-12,beat*.7,'piano'),.034)
            if not bells:
                # Quiet march drum, generated noise with smooth attack/release.
                t=np.arange(int(SR*.11))/SR
                drum=(rng.normal(0,1,len(t))*.15+np.sin(2*np.pi*(90-180*t)*t)*.5)*np.exp(-t*42)*np.minimum(t/.003,1)
                put(when,drum,.08 if b%2==0 else .11)
        if bells and bar%4==3:
            for i,n in enumerate([chord[0]+12,chord[1]+12,chord[2]+12]):
                put((bar*4+2+i*.23)*beat,tone(n,beat*1.3,'bell'),.035)
    # Small, deterministic room reflection and click-free loop boundaries.
    delay=int(.095*SR); audio[delay:] += audio[:-delay].copy()*.075
    fade=int(.18*SR);audio[:fade]*=np.linspace(0,1,fade);audio[-SR:]*=np.linspace(1,0,SR)
    audio=np.tanh(audio*.9); audio*=.78/max(.78,np.max(np.abs(audio)))
    with tempfile.TemporaryDirectory(prefix='aquarium-audio-') as temp:
        wav=Path(temp)/'render.wav'
        with wave.open(str(wav),'wb') as w:
            w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((audio*32767).astype('<i2').tobytes())
        path=OUT/name
        subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(),'-y','-loglevel','error','-i',str(wav),'-codec:a','libmp3lame','-b:a','112k','-map_metadata','-1',str(path)],check=True)
    return {'filename':name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'duration_seconds':round(len(audio)/SR,3),'bytes':path.stat().st_size,'sample_rate':SR,'source':'tools/akvaryum-seasonal-audio.py','recording':'New procedural instrumental recording; no third-party samples','bpm':bpm,'peak':round(float(np.max(np.abs(audio))),4),'rms':round(float(np.sqrt(np.mean(audio**2))),4)}

# Common melody only. Accompaniment and timbre above are newly authored.
a=sequence('A4 E5:.5 E5:.5 E5:.5 E5:.5 E5:.5 E5:.5 F5:.5 E5:.5 D5:.5 F5:.5 E5:2')
b=sequence('E5 A5 G5:.5 F5:.5 E5:.5 D5:.5 E5:.5 D5:.5 C5:.5 B4:.5 C5 - C5 E5 D5:.5 C5:.5 B4:.5 A4:.5 C5:.5 B4:.5 A4:.5 G#4:.5 A4 -')
izmir=a*4+b*2
# Jingle Bells chorus, public-domain composition by James Lord Pierpont (1857).
jingle=sequence('E5 E5 E5:2 E5 E5 E5:2 E5 G5 C5:1.5 D5:.5 E5:4 F5 F5 F5:1.5 F5:.5 F5 E5 E5 E5:.5 E5:.5 E5 D5 D5 E5 D5:2 G5:2 E5 E5 E5:2 E5 E5 E5:2 E5 G5 C5:1.5 D5:.5 E5:4 F5 F5 F5:1.5 F5:.5 F5 E5 E5 E5:.5 E5:.5 G5 G5 F5 D5 C5:4')
am=[69,72,76]; cm=[60,64,67]; dm=[62,65,69]; em=[64,68,71]; fm=[65,69,72]; gm=[67,71,74]
izmir_chords=[am,am,am,am,am,am,am,am,am,cm,dm,em,am,cm,dm,am]
jingle_chords=[cm,cm,cm,cm,fm,cm,gm,gm,cm,cm,cm,cm,fm,cm,gm,cm]
meta=[render('izmir-enstrumantal.mp3',izmir,116,izmir_chords,'brass'),render('jingle-bells.mp3',jingle*2,112,jingle_chords,'bell',True)]
meta[0]['melody']='İzmir Marşı — traditional / anonymous attribution; see LISANS.md'
meta[1]['melody']='Jingle Bells — James Lord Pierpont (1857); public domain composition'
(OUT/'mevsimlik-kaynaklar.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(meta,ensure_ascii=False,indent=2))
