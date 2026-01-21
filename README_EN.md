# AI漫剧工场



The inspiration comes from the one-stop comic production platform [AniKuku AI Comic Production Platform](https://anikuku.com/?github).

> For business inquiries, questions, and communication, please contact me.

> cinegen@ullrai.com


**AI漫剧工场** is a professional productivity tool designed for **AI Motion Comics**, **Webtoons**, and **Video Animatics**.

Moving away from the traditional "slot machine" style of random generation, CineGen adopts an industrial **"Script-to-Asset-to-Keyframe"** workflow. By deeply integrating Google's Gemini 2.5 Flash and Veo models, it achieves precise control over character consistency, scene continuity, and camera movement.

## Core Philosophy: Keyframe-Driven

Traditional Text-to-Video models often struggle with specific camera movements and precise start/end states. CineGen introduces the animation concept of **Keyframes**:

1.  **Draw First, Move Later**: First, generate precise Start and End frames.
2.  **Interpolation**: Use the Veo model to generate smooth video transitions between these two frames.
3.  **Asset Constraint**: All visual generation is strictly constrained by "Character Sheets" and "Scene Concepts" to prevent hallucinations or inconsistencies.

## Key Features

### Phase 01: Script & Storyboard
*   **Intelligent Breakdown**: Input a novel or story outline, and the AI automatically breaks it down into a standard script structure (Scenes, Time, Atmosphere).
*   **Visual Translation**: Automatically converts text descriptions into professional visual prompts.
*   **Pacing Control**: Set target durations (e.g., 30s Teaser, 3min Short), and the AI plans shot density accordingly.

### Phase 02: Assets & Casting
*   **Character Consistency**:
    *   Generate standard Reference Images for every character.
    *   **Wardrobe System**: Support for multiple looks (e.g., Casual, Combat, Injured) while maintaining facial identity based on a Base Look.
*   **Set Design**: Generate environmental reference images to ensure lighting consistency across different shots in the same location.

### Phase 03: Director Workbench
*   **Grid Storyboard**: Manage all shots in a panoramic view.
*   **Precise Control**:
    *   **Start Frame**: The strictly consistent starting image of the shot.
    *   **End Frame**: (Optional) Define the state at the end of the shot (e.g., character turns head, lighting shifts).
*   **Context Awareness**: When generating shots, the AI automatically reads the Context (Current Scene Image + Character's Specific Outfit Image) to solve continuity issues.
*   **Veo Video Generation**: Supports both Image-to-Video and Keyframe Interpolation modes.

### Phase 04: Export
*   **Timeline Preview**: Preview generated motion comic segments in a timeline format.
*   **Render Tracking**: Monitor API render progress in real-time.
*   **Asset Export**: Export all high-def keyframes and MP4 clips for post-production in Premiere/After Effects.

## Tech Stack

*   **Frontend**: React 19, Tailwind CSS (Sony Industrial Design Style)
*   **AI Models**:
    *   **Logic/Text**: `gemini-2.5-flash`
    *   **Vision**: `gemini-2.5-flash-image` (Nano Banana)
    *   **Video**: `veo-3.1-fast-generate-preview`
*   **Storage**: IndexedDB (Local browser database, privacy-focused, no backend dependency)

## Quick Start

1.  **Configure Key**: Launch the app and input your Google Gemini API Key (GCP billing required for Veo).
2.  **Input Story**: In Phase 01, enter your story idea and click "Generate Script".
3.  **Art Direction**: Go to Phase 02, generate character sheets and scene concepts.
4.  **Shot Production**: Go to Phase 03, generate keyframes for each shot.
5.  **Motion Generation**: Once keyframes are approved, batch generate the video clips.

---
*Built for Creators, by CineGen.*
