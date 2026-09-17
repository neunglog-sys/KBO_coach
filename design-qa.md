**Comparison Target**

- Source visual truth path: `C:\Users\Taeneung PC\AppData\Local\Temp\codex-clipboard-ed50cb4c-823c-4762-bf90-fc5a5d0c9901.png`
- Implementation screenshot path: Computer Use in-app browser capture, local tab 6 (`http://127.0.0.1:5000/`), captured during this QA run
- Viewport: 390 x 844 CSS px
- Source pixels: 1170 x 2532 px (iPhone screenshot including Discord/Safari browser chrome)
- Implementation pixels: 390 x 844 px at device scale factor 1
- Density normalization: source reviewed at its native 3x capture; implementation measurements compared in CSS pixels. Browser chrome was excluded from visual-fidelity findings and used only to establish the visible-content boundary.
- State: public web guest mode, Hanwha selected, guest notice dismissed, main screen with chat sheet expanded

**Findings**

- No remaining actionable P0/P1/P2 finding in the tested state.
- Fonts and typography: unchanged by this patch; existing Korean hierarchy, weights, wrapping, and control labels remain intact.
- Spacing and layout rhythm: the stage and chat sheet now terminate at the measured visual viewport bottom. At 390 x 844, `.stage-view` and `.stage-chat` both end at 844 px and `.stage-inputbar` ends at 830 px, leaving the input controls visible and clickable.
- Colors and visual tokens: unchanged; the stadium, guest bar, chat panel, and control colors match the existing implementation.
- Image quality and asset fidelity: unchanged; existing stadium and character assets remain sharp and correctly cropped in the tested viewport.
- Copy and content: unchanged; guest-mode labels and chat prompt remain present.

**Full-view Comparison Evidence**

- Source: the iPhone/Discord capture shows the chat panel extending beneath the browser's lower chrome, preventing reliable access to the input area.
- Implementation: the 390 x 844 browser capture shows the full chat handle, prompt, text field, voice controls, and bottom padding inside the visible viewport.
- Read-only geometry check: visual viewport `844px`; CSS variable `--app-viewport-height: 844px`; stage bottom `844px`; chat bottom `844px`; input bar bottom `830px`.

**Focused Region Comparison Evidence**

- Focused region: bottom chat sheet and input controls, because this was the reported failure area.
- Resize simulation: at 390 x 650, stage bottom `650px` and input bar bottom `636px`; after restoring 390 x 844, stage bottom returned to `844px` and input bar bottom returned to `830px`.
- This confirms that Safari-style visible-height changes and restoration update the layout instead of leaving the chat controls hidden.

**Comparison History**

- Earlier P0: persistent chat controls were pushed below the visible iPhone browser viewport and could not be clicked or dragged.
- Fix: web-only `visualViewport` synchronization now writes the measured height/top offset to CSS variables; `.plat-web .stage-view` uses those values. Native Capacitor behavior remains unchanged.
- Post-fix evidence: full chat input controls visible at 390 x 844; shrink-and-restore geometry remained synchronized at both viewport heights.

**Open Questions**

- Real-device Safari and Discord should receive one final smoke test after deployment because desktop mobile emulation cannot reproduce every browser-chrome animation detail.

**Implementation Checklist**

- [x] Preserve native iOS/Android layout behavior.
- [x] Track mobile web visual viewport resize and scroll changes.
- [x] Keep the chat sheet and input controls within the visible viewport.
- [x] Verify shrink-and-restore behavior.
- [x] Run TypeScript and production build checks.

**Follow-up Polish**

- None required for this scoped fix.

final result: passed
