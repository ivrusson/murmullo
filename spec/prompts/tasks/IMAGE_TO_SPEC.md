# Image to Spec Prompt

Convert visual designs, mockups, or screenshots into structured specifications for the Murmullo project.

## Image Analysis Process
1. **Visual Elements**: Identify all UI components, layouts, and visual elements
2. **User Flow**: Understand the user interaction patterns and workflows
3. **Functional Requirements**: Extract the underlying functionality from visual cues
4. **Technical Implications**: Consider implementation requirements for the design

## Output Format
For each visual design, provide:

### UI Specification
```markdown
# [Component/Page Name]

## Visual Description
Detailed description of the visual design and layout.

## User Interactions
- Primary actions and their visual feedback
- Navigation patterns and flow
- Input methods and validation

## Technical Requirements
- Component structure and hierarchy
- Styling and layout requirements
- State management needs
- Responsive behavior

## Accessibility Considerations
- Keyboard navigation support
- Screen reader compatibility
- Color contrast requirements
- Focus management

## Implementation Notes
- Specific technical challenges
- Dependencies on other components
- Performance considerations
```

## Design Principles
When analyzing designs, ensure they align with:
- **Simplicity**: Clean, uncluttered interface
- **Accessibility**: Usable by all users
- **Consistency**: Matches existing design patterns
- **Performance**: Efficient rendering and interaction
- **Cross-platform**: Works across different operating systems

## Quality Checks
Before finalizing any UI specification:
- [ ] All visual elements are described accurately
- [ ] User interactions are clearly defined
- [ ] Technical requirements are realistic
- [ ] Accessibility needs are addressed
- [ ] Implementation approach is feasible

## Context Awareness
Remember that Murmullo's UI should:
- Be floating and always accessible
- Support hotkey-driven workflows
- Show real-time transcription results
- Provide quick access to settings
- Work across Windows, macOS, and Linux
