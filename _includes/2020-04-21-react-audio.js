import React from "react";
import ReactDOM from "react-dom";

const AudioContext = React.createContext(null);
const audioRef = new Audio();
const AudioProvider = ({ children }) => {
  return (
    <AudioContext.Provider value={audioRef}>{children}</AudioContext.Provider>
  );
};

const BLEATS = [
  {
    id: 0,
    name: "first",
    src:
      "https://audio.ykyz.com/files/f7/f71eb013219dda9f0a7318c6c4eabd3541c562ad.mp3",
  },
  {
    id: 1,
    name: "second",
    src:
      "https://audio.ykyz.com/files/39/39031cf1a32ea645482ad0225a77f5e51e32297c.mp3",
  },
  {
    id: 2,
    name: "third",
    src:
      "https://audio.ykyz.com/files/da/da94e5fcd1fd8c9043f6ce854a13a05dc1a573e9.mp3",
  },
];

const Playlist = () => {
  const audio = React.useContext(AudioContext);

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [currentIndex, setCurrentIndex] = React.useState(null);
  const [isPlayingAll, setIsPlayingAll] = React.useState(false);

  const play = React.useCallback(
    (index) => {
      setIsPlayingAll(false);
      setCurrentIndex(index);
      audio.src = BLEATS[index].src;
      audio.play();
    },
    [audio]
  );
  const playAll = React.useCallback(() => {
    const index = 0;
    setIsPlayingAll(true);
    setCurrentIndex(index);
    audio.src = BLEATS[index].src;
    audio.play();
  }, [audio]);
  const maybeAdvancePlaylist = React.useCallback(() => {
    const newIndex = currentIndex + 1;
    if (newIndex > BLEATS.length) {
      return;
    }
    if (isPlayingAll) {
      setCurrentIndex(newIndex);
      audio.src = BLEATS[newIndex].src;
      audio.play();
    }
  }, [currentIndex, isPlayingAll]);

  React.useEffect(() => {
    audio.addEventListener("play", () => setIsPlaying(true));
    audio.addEventListener("pause", () => setIsPlaying(false));
    audio.addEventListener("ended", maybeAdvancePlaylist);
    return () => {
      // TODO remove other listeners
      audio.removeEventListener("ended", maybeAdvancePlaylist);
    };
  }, [audio, maybeAdvancePlaylist]);

  return (
    <div>
      <button onClick={playAll}>play all</button>
      {BLEATS.map((bleat, i) => (
        <Bleat
          key={bleat.id}
          name={bleat.name}
          isPlaying={isPlaying && currentIndex === i}
          play={() => (isPlaying ? audio.pause() : play(i))}
        />
      ))}
    </div>
  );
};

const Bleat = ({ name, isPlaying, play }) => (
  <div onClick={play}>
    {isPlaying ? "❚❚" : "►"} {name}
  </div>
);

const App = () => (
  <AudioProvider>
    <Playlist />
  </AudioProvider>
);

ReactDOM.render(<App />, document.querySelector("#app"));
