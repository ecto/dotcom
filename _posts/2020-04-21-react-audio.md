---
layout: post
title: Sharing Audio in React with useContext
date: 2020-04-21
---

I ❤️ React Hooks, and my favorite lately is `useContext`.

I was working with [YKYZ](https://ykyz.com) recently, an audio-based social network. They have a feature that lets you listen to all Bleats (audio uploads) one after the other. But the mechanism was breaking.

Most browsers now disable autoplaying audio by requiring a user interaction to `play()` an `Audio` instance. I figured the bug had something to do with this, so after confirming the behavior on several browsers I started digging into the code. I noticed that every `Bleat` component had its own `Audio` instance, and the autoplay was coordinated by a higher-level component.

After reading some MDN docs, I realized that most browsers must implement the interaction component per-`Audio` rather than per-pageload, which was an assumption in the existing code. I threw together a tiny proof of concept to see if detecting the end of the clip, swapping the `src`, and playing again could get around the interaction requirement, and it did. But how to implement a shared audio context in React?

![Sharing audio like Jim and Pam](/images/jim-and-pam.jpg) <center><small>Sharing audio like Jim and Pam</small></center>

## Context vs Props

Most times when a codebase needs to share state, people jump to [Redux](https://redux.js.org/). As a quick overview, Redux implements the Dispatcher pattern from [Flux](https://facebook.github.io/flux/docs/dispatcher) - basically just a JSON store, but funneling all the mutations to that store through a central point to ensure all those different mutations are exlicitly defined. [react-redux](https://react-redux.js.org/) is then used to pass this JSON store and dispatcher down through React Context, and `connect` is used to patch this context into the component's props.

None of this is really necessary, especially just to share an Audio instance. Also, Redux wasn't in the codebase I was using and this wasn't the right reason to introduce it. All we really want to do here is decouple the Audio itself, the control of that Audio, and the display of the current state of the Audio. We can express all of that in React through components.

When [inverting control](https://en.wikipedia.org/wiki/Inversion_of_control) of the Audio, this takes the form of putting the shared `Audio` component toward the top of the tree rather than the bottom, where each Bleat had its own Audio instance. We could pass the instance down through [props](https://reactjs.org/docs/components-and-props.html) but that could end up really messy, because the components which use it might be in arbitary positions in the component tree. The solution here is [context](https://reactjs.org/docs/context.html), the same mechanism react-redux uses to share Redux's store down to `connect`.

## Sharing the audio

We want to share an `Audio` instance. We could also put it into a `ref` to defer its instantiation to the component's lifecycle, but this works for now.

```jsx
const audio = new Audio();
```

We start by defining a `context`, and initializing it with audio context. We could also with null so consumers of the context know if it's been initialized or not, but we have it so we might as well use it. The `null` pattern is also common if you are loading something asynchronously that you'll provide later.

```jsx
const AudioContext = React.createContext(audio);
```

Now we want to define a provider component - this could just go straight into the app, but breaking the `Provider` out allows us to package this nicely into a file without exporting the `AudioContext` we created above. Passing the `audio` to the Provider here allows changes to propogate down, if it was for example a return value of `useRef` or `useState` instead of just the constant above.

```jsx
export const AudioProvider = ({ children }) => (
  <AudioContext.Provider value={audio}>{children}</AudioContext.Provider>
);
```

Now how do we get access to the `audio` further down the tree? First we need to wrap any components that want to use it with the Provider we created:

```jsx
const App = () => (
  <AudioProvider>
    <Playlist />
  </AudioProvider>
);
```

We can wrap the `useContext` hook, again to avoid exporting the AudioContext:

```jsx
export const useAudio = React.useContext(AudioContext);
```

Now we can use our custom hook down the tree with `useAudio`:

```jsx
const Playlist = () => {
  const audio = useAudio();

  const play = React.useCallback((src) => {
    audio.src = src;
    audio.play();
  }, [audio]);

  ...
};
```

## Making a playlist

Now that we have a shared audio context, let's make it do something. We'll centralize control into the `Playlist` component. It will hold info about all the clips to play (in a real application this would come from the server, but we're just using a constant for now). Let's add some state to the Playlist:

```jsx
const [isPlaying, setIsPlaying] = React.useState(false);
const [currentIndex, setCurrentIndex] = React.useState(null);
const [isPlayingAll, setIsPlayingAll] = React.useState(false);
```

When the audio plays or pauses, let's store that state. When the clip ends, let's move to the next one. We create these event listeners inside a `useEffect` to allow cleanup when the component unmounts:

```jsx
const maybeAdvancePlaylist = React.useCallback(() => {
  const newIndex = currentIndex + 1;

  // stop at the last clip
  if (newIndex > BLEATS.length) {
    return;
  }

  // don't advance if a single clip was played
  if (isPlayingAll) {
    setCurrentIndex(newIndex);
    audio.src = BLEATS[newIndex].src;
    audio.play();
  }
}, [currentIndex, isPlayingAll]);

React.useEffect(() => {
  audio.addEventListener("ended", maybeAdvancePlaylist);

  // when unmounting, clean up the event listener we've added
  return () => {
    audio.removeEventListener("ended", maybeAdvancePlaylist);
  };
}, [audio, maybeAdvancePlaylist]);
```

## Let's see it!

The following audio files should play through, using a shared audio context:

<div id="app">Loading...</div>
<script src="/dist/2020-04-21-react-audio.js"></script>

## Hooks are fun

The context + hooks approach has several advantages:

1. it doesn't use any external libraries, but you could easily share [Howler](https://howlerjs.com/) this way, for instance
2. you can bring the `AudioContext` file over to another project easily without altering its Redux system
3. we can provide this functionality surgically, only touching the components we need, by not threading props
4. the changes to the codebase are obvious - `useAudio` can't be much clearer in my opinion

But the best part is that it's **fun**! Hooks are super simple to write, refactor, and abstract. And in my opinion frontend work is fun because you get to interact with it - audio adds on top of the visual part of that!
