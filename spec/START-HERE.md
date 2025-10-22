# START HERE

Welcome to the Murmullo specification! This document will guide you through understanding and contributing to the project.

## Quick Start
1. **Read the ONEPAGER.md** - Get the high-level overview
2. **Review ACCEPTANCE.md** - Understand what "done" looks like
3. **Check QUESTIONS.md** - See what decisions need to be made
4. **Explore features/** - Dive into specific feature specifications

## Project Status
- **Current Phase**: Bootstrap (specification creation)
- **Next Phase**: Planning (detailed feature breakdown)
- **Target**: Working MVP with core transcription functionality

## Key Decisions Needed
Before moving to implementation, we need answers to the questions in QUESTIONS.md, particularly:
- Primary use case and target audience
- Model selection strategy (speed vs accuracy)
- UI/UX approach for floating interface
- Integration method priorities

## Getting Involved
- **Contributors**: Start with ACCEPTANCE.md to understand requirements
- **Users**: Focus on QUESTIONS.md to help shape the product
- **Developers**: Check features/ directory for detailed specifications

## Specification Structure
```
spec/
├── ONEPAGER.md          # High-level project overview
├── ACCEPTANCE.md        # Detailed acceptance criteria
├── QUESTIONS.md         # Key decisions to resolve
├── START-HERE.md        # This file
├── features/            # Individual feature specs
│   ├── audio-recording/
│   ├── transcription/
│   ├── ui-floating/
│   └── integration/
└── prompts/             # AI prompts for development
    ├── system/
    └── tasks/
```

## Next Steps
1. Answer key questions from QUESTIONS.md
2. Create detailed feature specifications
3. Generate implementation tasks
4. Begin development with clear acceptance criteria
