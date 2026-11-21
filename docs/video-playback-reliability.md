# YouTube playback reliability

Milestone 6C investigated the two Milestone 6B fixture IDs, Carrie Cutler `T9tsr-366FE` and Lovevery `4HhnHDcMTfw`, on 21 November 2026. The fixtures ran signed out in a loopback-only Vite harness using the real `ChapterVideos` component and lesson resource styles. The student reviewed-video list stayed empty.

## Investigation

| Check | Evidence |
| --- | --- |
| Initial 0:00 | On the base commit, both embeds loaded in YouTube's cued state (5). The earlier harness looked for CSS classes that did not match the displayed Play control and timed out before starting playback. Waiting for the accessible **Play video** button and clicking it advanced the baseline video clock for both IDs in Chrome, Firefox, and WebKit. A cued player at 0:00 is expected before the second interaction. |
| Network and embed restrictions | Both privacy-enhanced iframe documents returned HTTP 200. YouTube's player responses reported `OK` and `playableInEmbed: true`. Successful starts made HTTP 200 requests to Google Video media endpoints. The desktop trace showed no blocked player or media requests that explained the earlier result. |
| Console and iframe permissions | Chrome warned about declaring fullscreen in both `allow` and `allowfullscreen`. A local harness 404 and Firefox warnings for unsupported `encrypted-media` and YouTube scripts did not prevent desktop playback. Fullscreen remains in the iframe's explicit permission list. |
| CSP and referrer | The loopback parent response carried neither a CSP nor a Permissions Policy header. No CSP violation was observed. The iframe received the parent origin as its referrer under `strict-origin-when-cross-origin`. Production hosting headers were outside this test. |
| Autoplay | The first activation creates the iframe. Playback starts through YouTube's own Play control. The test used default autoplay policy with no autoplay parameter or permission delegation. |
| Keyboard focus | On the base commit, loading a player removed the focused button and focus returned to `BODY` in all three engines. The player still worked with a direct click, so the focus defect was separate from the earlier automation failure. |

The broad 6B stall reproduced when the test missed the Play control and cleared when the control was actually activated. Lovevery also showed a separate Chrome touch-emulation stall. On a 375 px retest, the player stayed cued (state 5) with media ready state 0 after the tap. The current evidence does not attribute that result to a first-party application defect or to a specific YouTube restriction.

## Application changes

- Focus the newly mounted, titled iframe when the load button is replaced. The focus callback runs on the iframe mount and does not start playback.
- Associate each localized load button and external link with its video title for assistive technology. The same **Open on YouTube** link remains available before and after loading. It opens the canonical URL built from the validated ID in a separate tab.
- Use one fullscreen permission declaration. Retain privacy-enhanced hosting, the existing 16:9 layout and reduced-motion styling. The application shows no inferred playback error. A loaded cross-origin iframe alone cannot establish whether the video can play.

## Browser checks

Fresh Playwright contexts used Chrome 157, Firefox 159, and WebKit 27.2. The harness used the app's resource column and panel styles. Each run checked reduced motion, no iframe request before activation, iframe focus, 16:9 geometry, horizontal overflow, English–Pashto switching and RTL, and a 44 px or larger external-link target. Switching languages removed the loaded iframe. Blocking the embed host left the external link keyboard-reachable and opened the correct watch URL in a new tab. The popup destination was intercepted to verify navigation independently of YouTube availability. WebKit used Option+Tab for link traversal with its keyboard settings.

| Browser | 320 px | 375 px | 1440 px |
| --- | --- | --- | --- |
| Chrome | Touch emulation. Cutler played. Lovevery clock stayed at 0:00. | Touch emulation. Cutler played. Lovevery clock stayed at 0:00. | Both started via keyboard. |
| Firefox | Both started via keyboard. | Both started via keyboard. | Both started via keyboard. |
| WebKit | Both started via touch emulation. | Both started via touch emulation. | Both started via keyboard. |

Layout, focus, language switching, and blocked-embed fallback checks passed at all nine browser-width combinations. The video-clock checks used the actual YouTube iframe. Firefox narrow-screen runs used keyboard input. Tests targeted the third-party Play button directly through browser automation. Native tab traversal through the live YouTube controls and audible screen-reader output still need manual verification.

Frontend automated tests (10), lint, production build, Go tests, and Go vet passed.

## Remaining checks

- Recheck Chrome mobile playback on physical Android and test Safari on physical iOS from a private deployment and a representative learner network. Verify focus entry and exit, touch and keyboard playback, fullscreen, caption controls, and the external link. Playwright WebKit results cover its engine in automation.
- At 320 and 375 px, the app's video column produced approximately 246×138 and 301×169 px viewports. These preserve 16:9 and fit the layout, but are below YouTube's documented 200 px minimum height. Playback succeeded in several narrow runs. Verify control usability on physical devices before relying on narrow inline playback.
- Check deployment CSP, referrer behavior, and network filtering if a stall recurs. Capture the player state, visible controls, and media request status after activating Play. Use the external link when embedding is unavailable. Continue the separate curriculum and owner approval workflow before learner activation.

References: [YouTube IFrame Player API requirements and errors](https://developers.google.com/youtube/iframe_api_reference), [Chrome autoplay policy](https://developer.chrome.com/blog/autoplay).
