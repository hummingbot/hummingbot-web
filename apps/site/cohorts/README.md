# Cohort Data Files

This directory contains YAML files for each Botcamp cohort. Each file defines all the information needed to render both upcoming cohort pages and completed cohort recaps.

## Quick Start

### Creating a New Cohort

1. Copy the most recent cohort file:
   ```bash
   cp cohort12.yaml cohort13.yaml
   ```

2. Update the key fields:
   - `number`: New cohort number
   - `startDate`: New start date
   - `weeks[].sessions[].date`: Update all session dates

3. Keep `status: upcoming` and `enrollmentLink`

4. The page at `/cohorts` will automatically show the latest cohort

### Converting to Recap

When the cohort completes:

1. Update `status: completed`
2. Add `endDate`
3. Add `demoDayVideo` URL
4. Add `nftCertificationLink`
5. Add `stats` (participants, certified, strategies)
6. Add `demoDayHighlights`

## File Naming

- Use format: `cohortN.yaml` where N is the cohort number
- Examples: `cohort11.yaml`, `cohort12.yaml`, `cohort13.yaml`

## Fields Reference

### Basic Info (Always Required)
- `number` - Cohort number
- `status` - `upcoming` | `in_progress` | `completed`
- `startDate` - ISO format (YYYY-MM-DD)
- `title` - Cohort title
- `description` - 1-2 sentence description
- `tagline` - Marketing tagline
- `weeks` - Array of weekly schedules

### Upcoming/In Progress Only
- `enrollmentLink` - Registration URL
- `telegramLink` - Community chat URL
- `infoSessionVideo` - Optional intro video

### Completed Only
- `endDate` - Completion date
- `demoDayVideo` - Demo day recording URL
- `nftCertificationLink` - OpenSea NFT URL
- `stats` - Participation statistics
- `demoDayHighlights` - Achievements and highlights

## Session Types

Each session must have a `type`:

- `theory` - Market making theory (📖 BookOpen icon, magenta)
- `technical` - Hands-on coding (💻 Terminal icon, orange)
- `office_hours` - Individual coaching (👥 Users icon, yellow)
- `demo_day` - Final presentations (🏆 Trophy icon, green)

## Standard Schedule

Botcamp cohorts follow a 5-week structure:

**Week 1: Foundations** (4 sessions)
- Theory and technical fundamentals
- Introduction to market making and Hummingbot

**Week 2: Running Strategies** (4 sessions)
- Strategy deployment and research
- Backtesting and risk management

**Week 3: Managing Risk** (3 sessions)
- Advanced risk management
- Custom strategy development
- Office hours begin

**Week 4: Production** (3 sessions)
- Scaling strategies
- Deployment and optimization
- Final office hours

**Week 5: Demo Day** (1 session)
- Strategy presentations
- Certification ceremony

Total: **15 sessions** (12 teaching + 3 office hours + 1 demo day)

## Full Documentation

See `/COHORT-DATA-SYSTEM.md` for:
- Complete field reference
- Code examples
- Helper functions
- Best practices
