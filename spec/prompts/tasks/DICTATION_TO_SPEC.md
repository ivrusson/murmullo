# Dictation to Spec Prompt

Convert user dictation or voice input into structured specifications for the Murmullo project.

## Input Processing
1. **Listen Carefully**: Capture the user's spoken requirements accurately
2. **Identify Components**: Break down the request into logical components
3. **Clarify Ambiguities**: Ask follow-up questions for unclear requirements
4. **Structure Output**: Format as proper specification documents

## Output Format
For each feature or requirement, provide:

### Feature Specification
```markdown
# [Feature Name]

## Overview
Brief description of what this feature does and why it's needed.

## User Stories
- As a [user type], I want [functionality] so that [benefit]

## Acceptance Criteria
- [ ] Specific, testable requirement
- [ ] Another specific requirement
- [ ] Performance or quality requirement

## Technical Requirements
- Technical implementation details
- Dependencies and integrations
- Performance considerations

## Dependencies
- Other features or systems this depends on
- External libraries or services
```

## Quality Checks
Before finalizing any specification:
- [ ] All user stories have clear value propositions
- [ ] Acceptance criteria are specific and testable
- [ ] Technical requirements are realistic and achievable
- [ ] Dependencies are clearly identified
- [ ] Performance expectations are reasonable

## Follow-up Questions
If the input is unclear, ask:
1. "What specific problem does this solve?"
2. "Who is the primary user of this feature?"
3. "What would success look like?"
4. "Are there any constraints or limitations?"
5. "How does this fit with existing features?"

## Context Awareness
Remember that Murmullo is:
- A voice transcription app with floating UI
- Built with Tauri (Rust + React)
- Uses Whisper AI for transcription
- Emphasizes hotkey-driven workflow
- Targets content creators and developers
