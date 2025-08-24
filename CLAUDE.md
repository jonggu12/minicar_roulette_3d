# Claude Code Instructions

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md

## Documentation Rules

### Task Completion Documentation Process

**IMPORTANT**: When completing any task or subtask, you MUST create a corresponding documentation file to explain the implementation for non-developers.

#### Documentation Requirements:

1. **File Location**: Create `.md` files in `.taskmaster/docs/task-explanations/`
2. **Naming Convention**: `task-{id}-{title-slug}.md` (예: `task-2.1-typescript-definitions.md`)
3. **Content Structure**:

```markdown
# Task {ID}: {Title}

## 🎯 What This Does (Plain English)
Write a simple, non-technical explanation of what was built and why it matters.

## 🔧 Technical Implementation
Brief technical overview for developers.

## 💡 Key Decisions Made
Explain important choices and the reasoning behind them.

## 🔗 How It Connects
Explain how this piece fits into the bigger picture.

## 🧪 How to Test/Verify
Simple steps to verify the implementation works.

## 📚 Next Steps
What comes next or what depends on this work.
```

#### Documentation Guidelines:

- **Use Plain Language**: Avoid jargon, explain technical terms
- **Include Context**: Why this was needed, what problem it solves  
- **Visual Analogies**: Use analogies to explain complex concepts
- **Business Value**: Explain the impact on end users/stakeholders
- **Keep It Concise**: 1-2 pages maximum per task

#### When to Create Documentation:

- ✅ After completing any main task (Task 1, 2, 3, etc.) - **ONE comprehensive document per main task**
- ❌ Skip individual subtask documentation (focus on main task completion)
- ❌ Skip for trivial tasks (like creating empty directories or simple configurations)

#### Integration with Task Master:

**For Main Tasks:**
1. Complete ALL subtasks within the main task
2. Create a single comprehensive documentation file covering the entire main task
3. Update main task with: `task-master update-task --id={id} --prompt="Comprehensive documentation created at .taskmaster/docs/task-explanations/{filename} covering all subtasks and implementation"`
4. Mark main task as done: `task-master set-status --id={id} --status=done`

**For Subtasks:**
1. Complete the technical implementation
2. Update subtask with implementation notes: `task-master update-subtask --id={id} --prompt="Implementation details and progress notes"`
3. Mark subtask as done: `task-master set-status --id={id} --status=done`
4. **Provide brief chat summary**: Give user a concise 2-3 sentence summary of what was accomplished in plain language
5. Continue to next subtask (no individual documentation file needed)

#### Subtask Completion Chat Summary Format:
```
✅ Task {ID} Complete: {Brief Title}
📝 What was done: [2-3 sentences explaining the accomplishment in simple terms]
🔗 Next: [What comes next or what this enables]
```

This ensures every significant piece of work is properly documented for team collaboration and future maintenance.
