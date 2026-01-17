from flask import Flask, jsonify
from mutagen import File as MutagenFile
from pathlib import Path

app = Flask(__name__)

MUSIC_DIR = Path(__file__).resolve().parent.parent / "music"


def get_song_info(path: Path):
    info = {
        "filename": path.name,
        "path": str(path.resolve()),
        "title": path.stem,
        "artist": "Unknown",
        "duration": None,
    }

    try:
        audio = MutagenFile(str(path), easy=True)
        if audio is not None:
            title = audio.get("title", [None])[0]
            artist = audio.get("artist", [None])[0]
            if title:
                info["title"] = title
            if artist:
                info["artist"] = artist
            if getattr(audio, "info", None) and getattr(audio.info, "length", None):
                info["duration"] = int(audio.info.length)
    except Exception:
        pass

    return info


@app.get("/songs")
def list_songs():
    songs = []
    if MUSIC_DIR.exists():
        for path in MUSIC_DIR.iterdir():
            if path.suffix.lower() in {".mp3", ".wav", ".flac", ".ogg"}:
                songs.append(get_song_info(path))
    return jsonify({"songs": songs})


@app.get("/")
def root():
    return "Cindo Music backend is running"


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
