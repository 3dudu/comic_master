# AI漫剧工场 (AI 만화·모션 코믹 제작 공장)

영감 출처: 원스톱 만화·모션 코믹 제작 플랫폼  
[AniKuku AI 만화 제작 플랫폼](https://anikuku.com/?github)

> 상업적 협업, 문의 및 커뮤니케이션  
> 📧 cinegen@ullrai.com

[中文](./README.md) ｜ [English](./README_EN.md) ｜ [日本語](./README_JA.md)

---

**AI漫剧工场**는 **AI 만화(Motion Comics)**, **동적 웹툰**, **영상 스토리보드(Animatic)** 제작을 위해 설계된 **전문급 AI 콘텐츠 제작 툴**입니다.  
AI 만화 제작, 모션 코믹 생성, 영상 프리비주얼라이제이션(Pre-visualization)에 최적화된 차세대 워크벤치입니다.

기존의 무작위적인 “카드 뽑기식(Text-to-Video)” 생성 방식을 버리고,  
**“Script → Asset → Keyframe”** 기반의 **산업화된 AI 제작 파이프라인**을 채택했습니다.  
Google **Gemini 2.5 Flash** 및 **Veo 비디오 생성 모델**을 깊이 통합하여,  
**캐릭터 일관성**, **장면 연속성**, **카메라 무브먼트 제어**를 정밀하게 구현합니다.

> **산업 등급 AI 만화 · 영상 생성 워크스테이션**  
> *Industrial AI Motion Comic & Video Workbench*

![UI Preview](./UI.png)

---

## 핵심 철학: 키프레임 기반 제작 (Keyframe-Driven)

기존 Text-to-Video AI는 카메라 워크와 시작·종료 화면 제어가 어렵습니다.  
CineGen은 애니메이션 제작의 핵심 개념인 **키프레임(Keyframe)**을 도입합니다.

1. **먼저 그리고, 그다음 움직인다**  
   정확한 시작 프레임(Start)과 종료 프레임(End)을 먼저 생성
2. **프레임 보간 생성**  
   Veo 비디오 모델을 활용해 두 프레임 사이를 부드러운 영상으로 자동 생성
3. **에셋 기반 제약**  
   캐릭터 설정 이미지와 배경 콘셉트 아트를 강하게 참조하여  
   캐릭터 붕괴·변형 문제를 원천 차단

👉 결과적으로 **AI 만화 제작**, **모션 코믹 생성**, **영상 일관성 제어**가 모두 해결됩니다.

---

## 핵심 기능 모듈

### Phase 01: 시나리오 & 스토리보드 (Script & Storyboard)
- **지능형 시나리오 분해**  
  소설 또는 스토리 개요를 입력하면,  
  AI가 장면·시간·분위기를 포함한 표준 시나리오 구조로 자동 변환
- **비주얼 프롬프트 변환**  
  텍스트를 Midjourney / Stable Diffusion용 전문 프롬프트로 자동 변환
- **러닝타임 제어**  
  30초 트레일러, 3분 숏폼 영상 등 목표 길이를 설정하면  
  AI가 자동으로 컷 밀도와 리듬을 설계

### Phase 02: 에셋 & 캐스팅 (Assets & Casting)
- **캐릭터 일관성(Character Consistency)**  
  - 각 캐릭터별 표준 레퍼런스 이미지 생성  
  - **의상 시스템(Wardrobe System)**  
    일상·전투·부상 등 다양한 스타일을 지원하며  
    기본 얼굴 특징(Base Look)은 유지
- **배경·세트 디자인(Set Design)**  
  장면별 환경 콘셉트 이미지를 생성하여  
  동일 공간에서의 조명·색감·무드 통일

### Phase 03: 감독 워크벤치 (Director Workbench)
- **그리드형 스토리보드 관리**  
  모든 샷(Shots)을 한눈에 관리
- **정밀 제어 기능**
  - **Start Frame**: 샷 시작 화면을 고정 생성 (강력한 일관성)
  - **End Frame**: (선택) 샷 종료 상태 정의  
    예: 인물 회전, 시선 변화, 조명 변화
- **컨텍스트 인식 AI**  
  현재 장면 + 현재 캐릭터 의상 정보를 자동 참조하여  
  “씬 불연속 문제”를 완전히 해결
- **Veo 영상 생성**  
  Image-to-Video 및 Keyframe Interpolation 모드 지원

### Phase 04: 렌더링 & 내보내기 (Export)
- **실시간 프리뷰**  
  타임라인 기반으로 생성된 AI 만화 영상 미리보기
- **렌더링 추적**  
  API 기반 영상 생성 진행 상황 실시간 모니터링
- **에셋 내보내기**  
  고해상도 키프레임 이미지 및 MP4 영상 클립 출력  
  → Premiere Pro, After Effects 후반 작업에 최적

---

## 기술 아키텍처 (Tech Stack)

- **Frontend**: React 19, Tailwind CSS  
  (Sony Industrial Design 스타일 UI)
- **AI 모델**
  - **텍스트·로직**: `gemini-2.5-flash`  
    (고급 시나리오 분석 및 구조화)
  - **이미지 생성**: `gemini-2.5-flash-image`  
    (Nano Banana · 초고속 콘셉트 아트 생성)
  - **비디오 생성**: `veo-3.1-fast-generate-preview`  
    (시작·종료 프레임 기반 영상 보간)
- **스토리지**: IndexedDB  
  (로컬 브라우저 저장 · 개인정보 보호 · 서버 불필요)

---

## 빠른 시작 (Quick Start)

1. **API 키 설정**  
   앱 실행 후 Google Gemini API Key 입력  
   (Veo 사용을 위해 GCP 결제 활성화 필요)
2. **스토리 입력**  
   Phase 01에서 스토리 아이디어 입력 → “스토리보드 생성”
3. **아트 설정**  
   Phase 02에서 주요 캐릭터와 핵심 배경 콘셉트 생성
4. **스토리보드 제작**  
   Phase 03에서 각 샷의 키프레임 생성
5. **영상 생성**  
   키프레임 확인 후, AI 영상 클립을 일괄 생성

---

*Built for Creators, by CineGen.*  
*AI 만화 제작자와 영상 크리에이터를 위한 차세대 도구*

👉 추천 플랫폼: [아니쿠쿠(AniKuku)](https://anikuku.com/?github-ko)
