# Manual Test Plan: Student Curriculum UI (#74)

## Prerequisites
- Local dev server running (`npm run dev`)
- Database seeded with curriculum data
- At least one student enrolled in a class

## Test Steps

### 1. Authentication & Navigation
- [ ] Sign in as a student (use dev impersonation if needed)
- [ ] Navigate to `/student` dashboard
- [ ] Verify enrolled classes are displayed
- [ ] Click on a class card

### 2. Curriculum Display - Success Case
- [ ] Verify you're redirected to `/student/classes/[classId]`
- [ ] Confirm "Curriculum" card is displayed
- [ ] Check that class name, grade level, and standards alignment appear in header
- [ ] Verify curriculum units are displayed in accordion format
- [ ] Confirm each unit shows:
  - [ ] "Unit X" label in rose color
  - [ ] Unit title
  - [ ] Thai title (if different from English)

### 3. Lesson Display
- [ ] Expand a curriculum unit
- [ ] Verify lessons are displayed in order
- [ ] Check each lesson shows:
  - [ ] Progress icon (Circle for not started, CheckCircle for completed)
  - [ ] "Lesson X" label
  - [ ] Lesson title
  - [ ] Thai title (if different)
  - [ ] Progress badges (Completed/In Progress) where applicable
- [ ] Verify lessons have hover effects (border color change, shadow)

### 4. Progress Indicators (Placeholders)
- [ ] Verify all lessons show empty circle (not started) by default
- [ ] Confirm `completed: false` and `started: false` are working as placeholders

### 5. Error Cases
Test by manipulating URLs or session state:
- [ ] **Unauthenticated**: Sign out, try to access class URL directly
  - Expected: Error message "Please sign in to view this class"
- [ ] **Not Enrolled**: Try to access a class you're not enrolled in
  - Expected: Error message "You are not enrolled in this class"
- [ ] **Invalid Class**: Use a non-existent classId
  - Expected: Error message "Class not found"

### 6. Loading State
- [ ] Throttle network in browser DevTools (3G)
- [ ] Reload page
- [ ] Verify loading spinner appears with "Loading curriculum..." text

### 7. Empty State
Create a class with no curriculum units:
- [ ] Verify empty state message: "No curriculum available for this class yet..."

### 8. Responsiveness
- [ ] Test on mobile viewport (375px)
- [ ] Test on tablet viewport (768px)
- [ ] Test on desktop viewport (1920px)
- [ ] Verify accordion expands/collapses properly on all viewports

### 9. Back Navigation
- [ ] Click "Back to dashboard" link
- [ ] Verify you're returned to `/student` page

## Expected API Response Format
```json
{
  "class": {
    "id": "string",
    "name": "Grade 3 Science - Thai Standards",
    "gradeLevel": 3,
    "standardsAlignment": "THAI"
  },
  "units": [
    {
      "id": "unit-1",
      "title": "Introduction to Science & Living Things",
      "titleThai": "Introduction to Science & Living Things",
      "order": 1,
      "lessons": [
        {
          "id": "g3-intro-science",
          "slug": "g3-intro-science",
          "title": "What is Science?",
          "titleThai": "What is Science?",
          "order": 1,
          "completed": false,
          "started": false
        }
      ]
    }
  ]
}
```

## Known Limitations
- Thai translations show same as English (schema doesn't support Thai yet)
- Slug uses lesson ID (schema doesn't have slug field yet)
- Progress indicators are placeholders (always false)
- Lessons are not clickable yet (Story #66)

## Pass Criteria
- [ ] All success cases work
- [ ] All error cases display appropriate messages
- [ ] Loading states work correctly
- [ ] UI is responsive on all viewports
- [ ] Build completes without errors
- [ ] Linter passes with no warnings
