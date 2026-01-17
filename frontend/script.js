const audio = document.getElementById("player");
const coverImage = document.querySelector(".cover-image");
const trackTitle = document.querySelector(".track-title");
const trackArtist = document.querySelector(".track-artist");
const progressRange = document.querySelector(".progress-range");
const currentTimeEl = document.querySelector(".current-time");
const durationTimeEl = document.querySelector(".total-time");
const volumeRange = document.querySelector(".volume-range");
const volumeIcon = document.querySelector(".volume-icon i");

const prevBtn = document.getElementById("prevBtn");
const playPauseBtn = document.getElementById("playPauseBtn");
const nextBtn = document.getElementById("nextBtn");
const loopBtn = document.getElementById("loopBtn");
const shuffleBtn = document.getElementById("shuffleBtn");

const playlistListEl = document.getElementById("playlistList");
const libraryListEl = document.getElementById("libraryList");
const recentListEl = document.getElementById("recentList");
const playlistSearchInput = document.getElementById("playlistSearch");
const addSongBtn = document.getElementById("addSongBtn");

const btnWinMin = document.getElementById("btnWinMin");
const btnWinClose = document.getElementById("btnWinClose");

const addModalBackdrop = document.getElementById("add-modal-backdrop");
const addCloseBtn = document.getElementById("add-close-btn");
const addCancelBtn = document.getElementById("add-cancel");
const addSaveBtn = document.getElementById("add-save");
const songFileBtn = document.getElementById("song-file-input");
const songFileLabel = document.getElementById("song-file-label");
const songTitleInput = document.getElementById("song-title-input");
const songArtistInput = document.getElementById("song-artist-input");
const coverFileInput = document.getElementById("cover-file-input");
const coverPreview = document.getElementById("cover-preview");

const albumListEl = document.getElementById("albumList");
const addAlbumBtn = document.getElementById("addAlbumBtn");
const playlistTitleEl = document.querySelector(".playlist-title");
const playlistBackBtn = document.getElementById("playlistBackBtn");

const albumModalBackdrop = document.getElementById("album-modal-backdrop");
const albumCloseBtn = document.getElementById("album-close-btn");
const albumCancelBtn = document.getElementById("album-cancel");
const albumSaveBtn = document.getElementById("album-save");
const albumNameInput = document.getElementById("album-name-input");
const albumCoverFileInput = document.getElementById("album-cover-file-input");
const albumCoverPreview = document.getElementById("album-cover-preview");

const chooseAlbumBackdrop = document.getElementById("choose-album-backdrop");
const chooseAlbumSelect = document.getElementById("choose-album-select");
const chooseAlbumClose = document.getElementById("choose-album-close");
const chooseAlbumCancel = document.getElementById("choose-album-cancel");
const chooseAlbumConfirm = document.getElementById("choose-album-confirm");

let playlistTracks = [];
let librarySongs = [];
let recentTracks = [];
let currentIndex = 0;
let isPlaying = false;
let isLoop = false;
let isShuffle = false;

let albums = [];
let activeAlbumId = null;

let pendingTrackIndexForAlbum = null;

const RECENT_STORAGE_KEY = "cindo_recent_tracks";
const PLAYER_STATE_KEY = "cindo_player_state";
const ALBUM_STORAGE_KEY = "cindo_albums";

let audioCtx;
let analyser;
let dataArray;
let wave1 = document.querySelector(".global-wave.wave1");
let wave2 = document.querySelector(".global-wave.wave2");

function formatTime(sec) {
  if (!sec && sec !== 0) return "0:00";
  const s = Math.floor(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m + ":" + (r < 10 ? "0" + r : r);
}

function setCoverPreviewFromDataUrl(dataUrl) {
  if (!coverPreview) return;
  coverPreview.innerHTML = "";
  const img = document.createElement("img");
  img.src = dataUrl;
  coverPreview.appendChild(img);
  coverPreview.dataset.coverDataUrl = dataUrl;
}

function setAlbumCoverPreview(dataUrl) {
  if (!albumCoverPreview) return;
  albumCoverPreview.innerHTML = "";
  const img = document.createElement("img");
  img.src = dataUrl;
  albumCoverPreview.appendChild(img);
  albumCoverPreview.dataset.coverDataUrl = dataUrl;
}

function uuid() {
  return "alb-" + Math.random().toString(36).slice(2, 10);
}

function saveRecentToStorage() {
  try {
    const raw = JSON.stringify(recentTracks);
    window.localStorage.setItem(RECENT_STORAGE_KEY, raw);
  } catch (e) {
    console.error("save recent error", e);
  }
}

function loadRecentFromStorage() {
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      recentTracks = parsed;
      renderRecentList();
    }
  } catch (e) {
    console.error("load recent error", e);
  }
}

function saveAlbumsToStorage() {
  try {
    const raw = JSON.stringify(albums);
    window.localStorage.setItem(ALBUM_STORAGE_KEY, raw);
  } catch (e) {
    console.error("save albums error", e);
  }
}

function loadAlbumsFromStorage() {
  try {
    const raw = window.localStorage.getItem(ALBUM_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      albums = parsed;
      renderAlbumList();
    }
  } catch (e) {
    console.error("load albums error", e);
  }
}

function savePlayerState() {
  try {
    if (!playlistTracks.length) return;
    const currentTrack = playlistTracks[currentIndex];
    if (!currentTrack) return;
    const state = {
      src: currentTrack.src || currentTrack.path || "",
      index: currentIndex,
      currentTime: audio.currentTime || 0,
      volume: audio.volume,
      isLoop,
      isShuffle
    };
    window.localStorage.setItem(PLAYER_STATE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("save player state error", e);
  }
}

function loadPlayerState() {
  try {
    const raw = window.localStorage.getItem(PLAYER_STATE_KEY);
    if (!raw) return;
    const state = JSON.parse(raw);
    if (!state || !playlistTracks.length) return;

    let idx = playlistTracks.findIndex(
      (t) => (t.src || t.path) === state.src
    );
    if (idx === -1 && typeof state.index === "number") {
      if (state.index >= 0 && state.index < playlistTracks.length) {
        idx = state.index;
      }
    }
    if (idx === -1) return;

    setTrack(playlistTracks[idx], idx);

    if (typeof state.volume === "number") {
      audio.volume = state.volume;
      if (volumeRange) {
        volumeRange.value = Math.round(state.volume * 100);
        const percent = volumeRange.value;
        volumeRange.style.backgroundSize = percent + "% 100%";
      }
      updateVolume();
    }

    isLoop = !!state.isLoop;
    audio.loop = isLoop;
    if (loopBtn) {
      if (isLoop) loopBtn.classList.add("active");
      else loopBtn.classList.remove("active");
    }

    isShuffle = !!state.isShuffle;
    if (shuffleBtn) {
      if (isShuffle) shuffleBtn.classList.add("active");
      else shuffleBtn.classList.remove("active");
    }

    audio.addEventListener(
      "loadedmetadata",
      () => {
        if (state.currentTime && audio.duration) {
          audio.currentTime = Math.min(state.currentTime, audio.duration - 1);
          updateProgressUI();
        }
        playCurrent();
      },
      { once: true }
    );
  } catch (e) {
    console.error("load player state error", e);
  }
}

function setupVisualizer() {
  if (audioCtx || !audio) return;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const source = audioCtx.createMediaElementSource(audio);

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 256;
  const bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  animateWaves();
}

function animateWaves() {
  if (!analyser) return;
  requestAnimationFrame(animateWaves);

  analyser.getByteFrequencyData(dataArray);

  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i];
  }
  const avg = sum / dataArray.length;
  const intensity = avg / 255;

  if (wave1) {
    const scale = 1 + intensity * 0.4;
    wave1.style.transform = `scaleY(${scale})`;
    wave1.style.opacity = 0.3 + intensity * 0.7;
  }
  if (wave2) {
    const scale = 1 + intensity * 0.3;
    wave2.style.transform = `scaleY(${scale})`;
    wave2.style.opacity = 0.15 + intensity * 0.5;
  }
}

if (coverFileInput) {
  coverFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCoverPreviewFromDataUrl(ev.target.result);
    };
    reader.readAsDataURL(file);
  });
}

if (albumCoverFileInput) {
  albumCoverFileInput.addEventListener("change", (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setAlbumCoverPreview(ev.target.result);
    };
    reader.readAsDataURL(file);
  });
}

function setTrack(track, index) {
  currentIndex = index;
  audio.src = track.src || track.path || "";
  if (trackTitle) {
    trackTitle.textContent = track.title || track.filename || "Unknown";
  }
  if (trackArtist) {
    trackArtist.textContent = track.artist || "Unknown";
  }
  if (coverImage) {
    const existingImg = coverImage.querySelector("img");
    const icon = coverImage.querySelector("i");
    if (track.cover) {
      if (existingImg) {
        existingImg.src = track.cover;
      } else {
        const img = document.createElement("img");
        img.src = track.cover;
        coverImage.appendChild(img);
      }
      if (icon) icon.style.display = "none";
    } else {
      if (existingImg) existingImg.remove();
      if (icon) icon.style.display = "block";
    }
  }
  highlightActivePlaylistItem();
  savePlayerState();
}

function playCurrent() {
  if (!audio.src) return;
  if (!audioCtx) {
    setupVisualizer();
  }
  audio
    .play()
    .then(() => {
      isPlaying = true;
      if (playPauseBtn) {
        playPauseBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      }
      if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
      }
    })
    .catch((err) => {
      console.error("play error:", err);
    });
}

function pauseCurrent() {
  audio.pause();
  isPlaying = false;
  if (playPauseBtn) {
    playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
  }
}

function togglePlayPause() {
  if (isPlaying) pauseCurrent();
  else playCurrent();
}

function playByIndex(index) {
  if (index < 0 || index >= playlistTracks.length) return;
  setTrack(playlistTracks[index], index);
  playCurrent();
  pushToRecent(playlistTracks[index]);
}

function getVisibleTrackIndexes() {
  if (activeAlbumId) {
    const album = albums.find((a) => a.id === activeAlbumId);
    if (!album) return playlistTracks.map((_, i) => i);
    return (album.trackIndexes || []).filter(
      (idx) => idx >= 0 && idx < playlistTracks.length
    );
  }
  return playlistTracks.map((_, i) => i);
}

function playNext() {
  if (playlistTracks.length === 0) return;

  const visibleIndexes = getVisibleTrackIndexes();
  if (!visibleIndexes.length) return;

  const currentVisiblePos = visibleIndexes.indexOf(currentIndex);

  if (isShuffle) {
    const candidates = visibleIndexes.filter((i) => i !== currentIndex);
    const nextIndex =
      candidates.length === 0
        ? currentIndex
        : candidates[Math.floor(Math.random() * candidates.length)];
    playByIndex(nextIndex);
    return;
  }

  if (currentVisiblePos === -1) {
    playByIndex(visibleIndexes[0]);
    return;
  }

  const nextVisiblePos = currentVisiblePos + 1;
  if (nextVisiblePos >= visibleIndexes.length) {
    isPlaying = false;
    if (playPauseBtn) {
      playPauseBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
    }
    return;
  }
  const nextTrackIndex = visibleIndexes[nextVisiblePos];
  playByIndex(nextTrackIndex);
}

function playPrev() {
  if (playlistTracks.length === 0) return;
  if (isShuffle) {
    let prevIndex = currentIndex;
    if (playlistTracks.length === 1) {
      prevIndex = currentIndex;
    } else {
      while (prevIndex === currentIndex) {
        prevIndex = Math.floor(Math.random() * playlistTracks.length);
      }
    }
    playByIndex(prevIndex);
    return;
  }
  let prevIndex = currentIndex - 1;
  if (prevIndex < 0) prevIndex = playlistTracks.length - 1;
  playByIndex(prevIndex);
}

function setLoop() {
  isLoop = !isLoop;
  audio.loop = isLoop;
  if (loopBtn) {
    if (isLoop) loopBtn.classList.add("active");
    else loopBtn.classList.remove("active");
  }
  savePlayerState();
}

function setShuffle() {
  isShuffle = !isShuffle;
  if (shuffleBtn) {
    if (isShuffle) shuffleBtn.classList.add("active");
    else shuffleBtn.classList.remove("active");
  }
  savePlayerState();
}

function updateVolume() {
  if (!volumeRange) return;
  const v = Number(volumeRange.value) / 100;
  audio.volume = v;
  if (volumeIcon) {
    if (v === 0) {
      volumeIcon.className = "fa-solid fa-volume-xmark";
    } else if (v < 0.4) {
      volumeIcon.className = "fa-solid fa-volume-low";
    } else {
      volumeIcon.className = "fa-solid fa-volume-high";
    }
  }
  const percent = volumeRange.value;
  volumeRange.style.backgroundSize = percent + "% 100%";
  savePlayerState();
}

function updateProgressUI() {
  if (!audio.duration || !progressRange) return;
  const percent = (audio.currentTime / audio.duration) * 100;
  progressRange.value = percent;
  progressRange.style.backgroundSize = percent + "% 100%";
  if (currentTimeEl) currentTimeEl.textContent = formatTime(audio.currentTime);
  if (durationTimeEl) durationTimeEl.textContent = formatTime(audio.duration);
}

function seekProgress(e) {
  if (!audio.duration) return;
  const percent = Number(e.target.value);
  audio.currentTime = (percent / 100) * audio.duration;
}

function pushToRecent(track) {
  const key = track.src || track.path;
  if (!key) return;
  recentTracks = recentTracks.filter(
    (t) => (t.src || t.path) !== key
  );
  recentTracks.unshift(track);
  if (recentTracks.length > 5) recentTracks.pop();
  renderRecentList();
  saveRecentToStorage();
}

function renderRecentList() {
  if (!recentListEl) return;
  recentListEl.innerHTML = "";
  recentTracks.forEach((track, index) => {
    const item = document.createElement("div");
    item.className = "recent-item";

    const idxEl = document.createElement("div");
    idxEl.className = "recent-index";
    idxEl.textContent = index + 1;

    const texts = document.createElement("div");
    texts.className = "recent-texts";

    const nameEl = document.createElement("div");
    nameEl.className = "recent-name";
    nameEl.textContent = track.title || track.filename || "Unknown";

    const artistEl = document.createElement("div");
    artistEl.className = "recent-artist";
    artistEl.textContent = track.artist || "Unknown";

    texts.appendChild(nameEl);
    texts.appendChild(artistEl);

    item.appendChild(idxEl);
    item.appendChild(texts);

    item.addEventListener("click", () => {
      const foundIndex = playlistTracks.findIndex(
        (t) => (t.src || t.path) === (track.src || track.path)
      );
      if (foundIndex !== -1) playByIndex(foundIndex);
      else {
        playlistTracks.push(track);
        renderPlaylistList();
        savePlaylistToDisk();
        playByIndex(playlistTracks.length - 1);
      }
    });

    recentListEl.appendChild(item);
  });
}

function renderLibraryList() {
  if (!libraryListEl) return;
  libraryListEl.innerHTML = "";
  librarySongs.forEach((song, index) => {
    const item = document.createElement("div");
    item.className = "library-item";

    const name = document.createElement("div");
    name.className = "library-name";
    const title = song.title || song.filename || "Unknown";
    const artist = song.artist || "Unknown";
    name.textContent = title + " — " + artist;

    const addBtn = document.createElement("button");
    addBtn.className = "library-add-btn";
    if (song.inPlaylist) {
      addBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
      addBtn.disabled = true;
    } else {
      addBtn.innerHTML = '<i class="fa-solid fa-plus"></i>';
      addBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openAddFromLibrary(index);
      });
    }

    item.appendChild(name);
    item.appendChild(addBtn);
    libraryListEl.appendChild(item);
  });
}

function openAddFromLibrary(libIndex) {
  const song = librarySongs[libIndex];
  if (!song || !addModalBackdrop) return;
  addModalBackdrop.classList.add("show");
  delete addModalBackdrop.dataset.editIndex;
  songTitleInput.value = song.title || song.filename || "";
  songArtistInput.value = song.artist || "";
  songFileLabel.textContent = song.filename || "Choose audio file";
  delete songFileBtn.dataset.fullPath;
  addModalBackdrop.dataset.libraryPath = song.path;
  coverPreview.innerHTML = '<span class="cover-placeholder">No cover</span>';
  delete coverPreview.dataset.coverDataUrl;
  if (coverFileInput) coverFileInput.value = "";
}

function renderAlbumList() {
  if (!albumListEl) return;
  albumListEl.innerHTML = "";
  albums.forEach((album, albumIndex) => {
    const item = document.createElement("div");
    item.className = "album-item";
    item.dataset.albumId = album.id;
    if (album.id === activeAlbumId) {
      item.classList.add("active");
    }

    const cover = document.createElement("div");
    cover.className = "album-cover";
    if (album.cover) {
      const img = document.createElement("img");
      img.src = album.cover;
      cover.appendChild(img);
    } else {
      const icon = document.createElement("i");
      icon.className = "fa-solid fa-plus";
      cover.appendChild(icon);
    }

    const nameEl = document.createElement("div");
    nameEl.className = "album-name";
    nameEl.textContent = album.name || "Untitled";

    const countEl = document.createElement("div");
    countEl.className = "album-count";
    countEl.textContent = (album.trackIndexes?.length || 0) + " tracks";

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "album-delete-btn";
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';

    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteAlbumByIndex(albumIndex);
    });

    const rightSide = document.createElement("div");
    rightSide.className = "album-right";
    rightSide.appendChild(countEl);
    rightSide.appendChild(deleteBtn);

    item.appendChild(cover);
    item.appendChild(nameEl);
    item.appendChild(rightSide);

    item.addEventListener("click", () => {
      setActiveAlbum(album.id);
    });

    albumListEl.appendChild(item);
  });
}

function setActiveAlbum(albumId) {
  activeAlbumId = albumId;
  const album = albums.find((a) => a.id === albumId);
  if (album && playlistTitleEl) {
    playlistTitleEl.textContent = album.name;
  } else if (playlistTitleEl) {
    playlistTitleEl.textContent = "Playlist";
  }
  renderPlaylistList();
}

if (playlistBackBtn) {
  playlistBackBtn.addEventListener("click", () => {
    activeAlbumId = null;
    if (playlistTitleEl) playlistTitleEl.textContent = "Playlist";
    renderPlaylistList();
  });
}

if (playlistTitleEl) {
  playlistTitleEl.addEventListener("click", () => {
    activeAlbumId = null;
    playlistTitleEl.textContent = "Playlist";
    renderPlaylistList();
  });
}

function openCreateAlbumPrompt() {
  if (!albumModalBackdrop) return;
  albumNameInput.value = "";
  albumCoverPreview.innerHTML =
    '<span class="cover-placeholder">No cover</span>';
  delete albumCoverPreview.dataset.coverDataUrl;
  if (albumCoverFileInput) albumCoverFileInput.value = "";
  albumModalBackdrop.classList.add("show");
}

function closeAlbumModal() {
  if (!albumModalBackdrop) return;
  albumModalBackdrop.classList.remove("show");
}

function handleSaveAlbum() {
  const name = albumNameInput.value.trim();
  if (!name) return;
  const newAlbum = {
    id: uuid(),
    name: name,
    cover:
      albumCoverPreview.dataset.coverDataUrl !== undefined
        ? albumCoverPreview.dataset.coverDataUrl
        : null,
    trackIndexes: []
  };
  albums.push(newAlbum);
  saveAlbumsToStorage();
  renderAlbumList();
  closeAlbumModal();
}

function deleteAlbumByIndex(albumIndex) {
  const album = albums[albumIndex];
  if (!album) return;

  const ok = window.confirm(
    `Xóa album "${album.name}"? Bài hát trong playlist vẫn giữ nguyên.`
  );
  if (!ok) return;

  const removed = albums.splice(albumIndex, 1)[0];

  if (removed && removed.id === activeAlbumId) {
    activeAlbumId = null;
    if (playlistTitleEl) playlistTitleEl.textContent = "Playlist";
  }

  saveAlbumsToStorage();
  renderAlbumList();
  renderPlaylistList();
}

function renderPlaylistList() {
  if (!playlistListEl) return;
  playlistListEl.innerHTML = "";
  const keyword = playlistSearchInput.value.trim().toLowerCase();
  const indexes = getVisibleTrackIndexes();
  indexes.forEach((idx, visibleIndex) => {
    const track = playlistTracks[idx];
    const title = track.title || track.filename || "Unknown";
    const artist = track.artist || "Unknown";
    const textForSearch = (title + " " + artist).toLowerCase();
    if (keyword && !textForSearch.includes(keyword)) return;

    const item = document.createElement("div");
    item.className = "playlist-item";
    item.dataset.index = idx;

    const indexEl = document.createElement("div");
    indexEl.className = "playlist-index";
    indexEl.textContent = visibleIndex + 1;

    const cover = document.createElement("div");
    cover.className = "playlist-cover";
    if (track.cover) {
      cover.style.backgroundImage = `url(${track.cover})`;
      cover.style.backgroundSize = "cover";
      cover.style.backgroundPosition = "center";
    }

    const texts = document.createElement("div");
    texts.className = "playlist-texts";

    const nameEl = document.createElement("div");
    nameEl.className = "playlist-name";
    nameEl.textContent = title;

    const artistEl = document.createElement("div");
    artistEl.className = "playlist-artist";
    artistEl.textContent = artist;

    texts.appendChild(nameEl);
    texts.appendChild(artistEl);

    const actions = document.createElement("div");
    actions.className = "playlist-actions";

    const btnPlayNext = document.createElement("button");
    btnPlayNext.className = "playlist-btn";
    btnPlayNext.innerHTML = '<i class="fa-solid fa-forward-step"></i>';

    const btnEdit = document.createElement("button");
    btnEdit.className = "playlist-btn";
    btnEdit.innerHTML = '<i class="fa-solid fa-pen"></i>';

    const btnDelete = document.createElement("button");
    btnDelete.className = "playlist-btn";
    btnDelete.innerHTML = '<i class="fa-solid fa-trash"></i>';

    const btnAddToAlbum = document.createElement("button");
    btnAddToAlbum.className = "playlist-btn";
    btnAddToAlbum.innerHTML = '<i class="fa-solid fa-folder-plus"></i>';

    actions.appendChild(btnPlayNext);
    actions.appendChild(btnEdit);
    actions.appendChild(btnDelete);
    actions.appendChild(btnAddToAlbum);

    item.appendChild(indexEl);
    item.appendChild(cover);
    item.appendChild(texts);
    item.appendChild(actions);

    item.addEventListener("click", () => {
      playByIndex(idx);
    });

    btnPlayNext.addEventListener("click", (e) => {
      e.stopPropagation();
      queuePlayNext(idx);
    });

    btnEdit.addEventListener("click", (e) => {
      e.stopPropagation();
      openEditSongModal(idx);
    });

    btnDelete.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteSongFromPlaylist(idx);
    });

    btnAddToAlbum.addEventListener("click", (e) => {
      e.stopPropagation();
      openChooseAlbumDialog(idx);
    });

    playlistListEl.appendChild(item);
  });
  highlightActivePlaylistItem();
}

function highlightActivePlaylistItem() {
  if (!playlistListEl) return;
  const items = playlistListEl.querySelectorAll(".playlist-item");
  items.forEach((item) => item.classList.remove("active"));
  const active = playlistListEl.querySelector(
    `.playlist-item[data-index="${currentIndex}"]`
  );
  if (active) active.classList.add("active");
}

function queuePlayNext(index) {
  if (index === currentIndex) return;
  if (index < 0 || index >= playlistTracks.length) return;
  const track = playlistTracks[index];
  playlistTracks.splice(index, 1);
  let insertPos = currentIndex + 1;
  if (insertPos > playlistTracks.length) insertPos = playlistTracks.length;
  playlistTracks.splice(insertPos, 0, track);
  renderPlaylistList();
  savePlaylistToDisk();
}

function openEditSongModal(index) {
  const track = playlistTracks[index];
  if (!track || !addModalBackdrop) return;
  addModalBackdrop.classList.add("show");
  addModalBackdrop.dataset.editIndex = index;
  delete addModalBackdrop.dataset.libraryPath;
  songTitleInput.value = track.title || track.filename || "";
  songArtistInput.value = track.artist || "";
  songFileLabel.textContent = track.src
    ? track.src.split(/[\\/]/).pop()
    : "Current file";
  delete songFileBtn.dataset.fullPath;
  if (track.cover) {
    setCoverPreviewFromDataUrl(track.cover);
  } else {
    coverPreview.innerHTML = '<span class="cover-placeholder">No cover</span>';
    delete coverPreview.dataset.coverDataUrl;
  }
  if (coverFileInput) coverFileInput.value = "";
}

function deleteSongFromPlaylist(index) {
  if (index < 0 || index >= playlistTracks.length) return;
  const removed = playlistTracks[index];
  playlistTracks.splice(index, 1);

  albums = albums.map((alb) => ({
    ...alb,
    trackIndexes: (alb.trackIndexes || [])
      .filter((i) => i !== index)
      .map((i) => (i > index ? i - 1 : i))
  }));
  saveAlbumsToStorage();

  if (playlistTracks.length === 0) {
    currentIndex = 0;
    audio.src = "";
    if (trackTitle) trackTitle.textContent = "No song";
    if (trackArtist) trackArtist.textContent = "Select files to play";
    if (coverImage) {
      const existingImg = coverImage.querySelector("img");
      if (existingImg) existingImg.remove();
    }
    pauseCurrent();
  } else if (index < currentIndex) {
    currentIndex -= 1;
  } else if (index === currentIndex) {
    if (currentIndex >= playlistTracks.length) currentIndex = 0;
    setTrack(playlistTracks[currentIndex], currentIndex);
  }

  if (removed && removed.src) {
    librarySongs = librarySongs.map((s) =>
      s.path === removed.src ? { ...s, inPlaylist: false } : s
    );
    renderLibraryList();
  }

  renderPlaylistList();
  savePlaylistToDisk();
}

function openChooseAlbumDialog(trackIndex) {
  if (!albums.length) {
    window.alert("Chưa có album nào, hãy tạo album trước.");
    return;
  }
  pendingTrackIndexForAlbum = trackIndex;

  if (!chooseAlbumBackdrop || !chooseAlbumSelect) return;

  chooseAlbumSelect.innerHTML = "";
  albums.forEach((album, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = album.name || `Album ${i + 1}`;
    chooseAlbumSelect.appendChild(opt);
  });

  chooseAlbumBackdrop.classList.add("show");
}

function closeChooseAlbumDialog() {
  pendingTrackIndexForAlbum = null;
  if (chooseAlbumBackdrop) {
    chooseAlbumBackdrop.classList.remove("show");
  }
}

if (chooseAlbumClose) {
  chooseAlbumClose.addEventListener("click", closeChooseAlbumDialog);
}
if (chooseAlbumCancel) {
  chooseAlbumCancel.addEventListener("click", closeChooseAlbumDialog);
}
if (chooseAlbumConfirm) {
  chooseAlbumConfirm.addEventListener("click", () => {
    const albumIndex = Number(chooseAlbumSelect.value);
    if (
      Number.isNaN(albumIndex) ||
      albumIndex < 0 ||
      albumIndex >= albums.length ||
      pendingTrackIndexForAlbum == null
    ) {
      return;
    }
    addTrackToAlbumByIndex(albumIndex, pendingTrackIndexForAlbum);
    closeChooseAlbumDialog();
  });
}

function addTrackToAlbumByIndex(albumArrayIndex, trackIndex) {
  const album = albums[albumArrayIndex];
  if (!album) return;

  if (!Array.isArray(album.trackIndexes)) {
    album.trackIndexes = [];
  }

  const idxNumber = Number(trackIndex);
  if (!album.trackIndexes.includes(idxNumber)) {
    album.trackIndexes.push(idxNumber);
    saveAlbumsToStorage();
    renderAlbumList();
    if (album.id === activeAlbumId) {
      renderPlaylistList();
    }
  }
}

async function loadLibraryFromDisk() {
  if (!window.electronAPI) return;
  try {
    const files = await window.electronAPI.listMusicFiles();
    librarySongs = Array.isArray(files) ? files : [];
    const playlistPaths = new Set(
      playlistTracks.map((t) => t.src || t.path)
    );
    librarySongs = librarySongs.map((song) => ({
      ...song,
      inPlaylist: playlistPaths.has(song.path)
    }));
    renderLibraryList();
  } catch (e) {
    console.error("Failed to load library", e);
  }
}

async function loadPlaylistFromDisk() {
  if (!window.electronAPI) {
    loadAlbumsFromStorage();
    loadRecentFromStorage();
    updateVolume();
    return;
  }
  try {
    const tracks = await window.electronAPI.loadPlaylist();
    playlistTracks = Array.isArray(tracks) ? tracks : [];
    renderPlaylistList();
    if (playlistTracks.length > 0) setTrack(playlistTracks[0], 0);
    await loadLibraryFromDisk();
    loadPlayerState();
    loadAlbumsFromStorage();
  } catch (e) {
    console.error("Failed to load playlist", e);
  }
}

async function savePlaylistToDisk() {
  if (!window.electronAPI) return;
  try {
    await window.electronAPI.savePlaylist(playlistTracks);
  } catch (e) {
    console.error("Failed to save playlist", e);
  }
}

function openAddModal() {
  if (!addModalBackdrop) return;
  addModalBackdrop.classList.add("show");
  songFileLabel.textContent = "Choose audio file";
  delete songFileBtn.dataset.fullPath;
  delete addModalBackdrop.dataset.editIndex;
  delete addModalBackdrop.dataset.libraryPath;
  songTitleInput.value = "";
  songArtistInput.value = "";
  coverPreview.innerHTML = '<span class="cover-placeholder">No cover</span>';
  delete coverPreview.dataset.coverDataUrl;
  if (coverFileInput) coverFileInput.value = "";
}

function closeAddModal() {
  if (!addModalBackdrop) return;
  addModalBackdrop.classList.remove("show");
}

if (playPauseBtn) playPauseBtn.addEventListener("click", togglePlayPause);
if (prevBtn) prevBtn.addEventListener("click", playPrev);
if (nextBtn) nextBtn.addEventListener("click", playNext);
if (loopBtn) loopBtn.addEventListener("click", setLoop);
if (shuffleBtn) shuffleBtn.addEventListener("click", setShuffle);
if (volumeRange) volumeRange.addEventListener("input", updateVolume);
if (progressRange) progressRange.addEventListener("input", seekProgress);

let lastStateSave = 0;
audio.addEventListener("timeupdate", () => {
  updateProgressUI();
  const now = Date.now();
  if (now - lastStateSave > 2000) {
    savePlayerState();
    lastStateSave = now;
  }
});

audio.addEventListener("ended", () => {
  if (!isLoop) playNext();
});

if (playlistSearchInput) {
  playlistSearchInput.addEventListener("input", () => {
    renderPlaylistList();
  });
}

if (addSongBtn) addSongBtn.addEventListener("click", openAddModal);

if (addCloseBtn) addCloseBtn.addEventListener("click", closeAddModal);
if (addCancelBtn) addCancelBtn.addEventListener("click", closeAddModal);

if (songFileBtn && window.electronAPI) {
  songFileBtn.addEventListener("click", async () => {
    const picked = await window.electronAPI.openAudioDialog();
    if (!picked) return;
    const baseName = picked.split(/[\\/]/).pop();
    songFileLabel.textContent = baseName;
    songFileBtn.dataset.fullPath = picked;
  });
}

if (addSaveBtn && window.electronAPI) {
  addSaveBtn.addEventListener("click", async () => {
    const editIndexRaw = addModalBackdrop.dataset.editIndex;
    const isEdit = editIndexRaw !== undefined;
    const editIndex = isEdit ? Number(editIndexRaw) : -1;
    const libraryPath = addModalBackdrop.dataset.libraryPath;
    const fullPath = songFileBtn.dataset.fullPath;
    const titleInput = songTitleInput.value.trim();
    const artistInput = songArtistInput.value.trim();
    const coverDataUrl =
      coverPreview.dataset.coverDataUrl !== undefined
        ? coverPreview.dataset.coverDataUrl
        : undefined;

    if (isEdit && !fullPath && !libraryPath) {
      const track = playlistTracks[editIndex];
      if (track) {
        track.title = titleInput || track.title || track.filename;
        track.artist = artistInput || track.artist || "Unknown";
        if (coverDataUrl !== undefined) {
          track.cover = coverDataUrl;
        }
      }
      renderPlaylistList();
      savePlaylistToDisk();
      delete addModalBackdrop.dataset.editIndex;
      closeAddModal();
      return;
    }

    if (!isEdit && libraryPath && !fullPath) {
      const baseName = libraryPath.split(/[\\/]/).pop();
      const title = titleInput || baseName;
      const artist = artistInput || "Unknown";
      const finalCover = coverDataUrl || "";
      playlistTracks.push({
        src: libraryPath,
        title,
        artist,
        cover: finalCover
      });
      librarySongs = librarySongs.map((s) =>
        s.path === libraryPath ? { ...s, inPlaylist: true } : s
      );
      renderLibraryList();
      renderPlaylistList();
      savePlaylistToDisk();
      delete addModalBackdrop.dataset.libraryPath;
      closeAddModal();
      return;
    }

    if (!fullPath) return;
    const baseName = fullPath.split(/[\\/]/).pop();
    const title = titleInput || baseName;
    const artist = artistInput || "Unknown";
    const res = await window.electronAPI.saveSongToMusic(fullPath, baseName);
    if (!res || !res.ok) return;
    const srcForPlayer = res.destPath || fullPath;
    const finalCover = coverDataUrl || "";
    if (isEdit) {
      playlistTracks[editIndex] = {
        ...(playlistTracks[editIndex] || {}),
        src: srcForPlayer,
        title,
        artist,
        cover: finalCover
      };
    } else {
      playlistTracks.push({
        src: srcForPlayer,
        title,
        artist,
        cover: finalCover
      });
    }
    await loadLibraryFromDisk();
    renderPlaylistList();
    savePlaylistToDisk();
    delete addModalBackdrop.dataset.editIndex;
    delete addModalBackdrop.dataset.libraryPath;
    closeAddModal();
  });
}

if (btnWinMin && window.electronAPI) {
  btnWinMin.addEventListener("click", () => {
    window.electronAPI.minimize();
  });
}
if (btnWinClose && window.electronAPI) {
  btnWinClose.addEventListener("click", () => {
    window.electronAPI.close();
  });
}

if (addAlbumBtn) {
  addAlbumBtn.addEventListener("click", openCreateAlbumPrompt);
}
if (albumCloseBtn) albumCloseBtn.addEventListener("click", closeAlbumModal);
if (albumCancelBtn) albumCancelBtn.addEventListener("click", closeAlbumModal);
if (albumSaveBtn) albumSaveBtn.addEventListener("click", handleSaveAlbum);

updateVolume();
loadPlaylistFromDisk();
loadRecentFromStorage();
loadAlbumsFromStorage();
