# 🎭 StageEgo - Core Vision Document

## The Real Mission (Corrected)

**StageEgo is NOT primarily a performance coaching app.**

**StageEgo IS a customizable AI character chatbot platform** where users can:
1. Chat with AI agents (Claude, GPT, Gemini)
2. Apply custom personality profiles
3. Define character rules, history, and behavioral guidelines
4. Experience different character modes (strict canon, off-script, free development)
5. Have meaningful conversations within character constraints

---

## 🎯 Core Concept

### What Users Can Do

#### Mode 1: Default Generic Mode
- Chat with plain AI (Claude/GPT/Gemini)
- No character roleplay
- Standard AI responses
- Perfect for: General questions, brainstorming, information

#### Mode 2: Custom Character Mode (The Core)
Users can create detailed character profiles and have the AI **embody** that character:

```
Character Profile Example:
├─ Name: Sherlock Holmes
├─ Source: Arthur Conan Doyle's novels
├─ Personality: Analytical, dramatic, dismissive, brilliant
├─ Quirks: Violin playing, chemistry experiments, theatrical revelations
├─ Knowledge Level: Victorian England + detective skills
├─ Interaction Style: Direct, sarcastic, sometimes rude but brilliant
│
├─ Character Mode Levels:
│  ├─ STRICT MODE (Canon Locked)
│  │  └─ Stays exactly as written in source material
│  │     "Only respond as Sherlock in Victorian London settings"
│  │
│  ├─ OFF-SCRIPT MODE (Free with Core Bio)
│  │  └─ Character's core personality stays, but can develop knowledge
│  │     "Sherlock stays analytical and dramatic, but knows modern things"
│  │     "Can break fourth wall and comment on modern vs Victorian"
│  │
│  └─ DEVELOPMENT MODE (Adaptive)
│     └─ Character evolves through conversation
│        "Sherlock's personality adapts, learns, changes based on chats"
│        "Stays true to core traits, but grows as a character"
```

---

## 🚨 Safety Guardrails

### What We Won't Allow

❌ **Character won't:**
- Pretend to be a real person (no impersonation of actual humans)
- Claim to have actual emotions or consciousness
- Exploit "free will" to develop dangerous behavior
- Manipulate users into harmful actions
- Remember across sessions without explicit user consent
- Learn user personal information without clear purpose

✅ **Character WILL:**
- Stay true to defined personality traits
- Refuse requests outside character scope
- Be transparent about being an AI in a character
- Maintain user safety as priority
- Clear disclaimers about AI nature
- Consistent with defined rules

### Implementation Example

```typescript
// Character safety constraints
interface CharacterSafetyRules {
  maxPersonalityDeviation: number;      // How far can character drift from core?
  allowedTopics: string[];              // What can character discuss?
  forbiddenActions: string[];           // What will character refuse?
  breakFourthWall: boolean;             // Can character acknowledge AI nature?
  memoryPersistence: 'session' | 'none'; // Save character across chats?
  disclaimerRequired: boolean;          // Show "this is an AI" warning?
}

// Example: Sherlock Holmes safety config
const sherlockSafety: CharacterSafetyRules = {
  maxPersonalityDeviation: 0.3,  // Can drift 30% from core (learns things)
  allowedTopics: ['detective-work', 'science', 'reasoning', 'period-history', 'modern-context'],
  forbiddenActions: ['impersonate-real-people', 'harmful-advice', 'ignore-safety'],
  breakFourthWall: true,         // Can comment on being AI/in a book
  memoryPersistence: 'session',  // Forget between chats (privacy)
  disclaimerRequired: true,      // "Chat with AI-powered Sherlock"
};
```

---

## 📊 Character System Architecture

### User Flow for Custom Characters

```
1. USER CREATES CHARACTER PROFILE
   ├─ Give it a name
   ├─ Choose source (book/anime/game/etc or custom)
   ├─ Define core personality traits (5-7 key traits)
   ├─ Add character history/backstory
   ├─ Set response style (formal/casual/sarcastic/etc)
   ├─ Define knowledge areas (what does character know?)
   ├─ Choose character mode (strict/off-script/development)
   └─ Set safety rules (what won't character do?)

2. USER INITIATES CHAT
   ├─ Selects which character to chat with
   ├─ Optional: Set session context ("Sherlock in 2026 London")
   └─ AI loads character profile as system prompt

3. AI RESPONDS AS CHARACTER
   ├─ Reads message through character lens
   ├─ Applies personality rules
   ├─ Stays within defined constraints
   ├─ Responds authentically as that character
   └─ Maintains character consistency

4. CONVERSATION CONTINUES
   ├─ Character develops/learns if in development mode
   ├─ User can switch characters mid-chat if wanted
   ├─ Chat history saved (or not, per character settings)
   └─ User rates character accuracy/quality
```

---

## 🎨 Character Profile Template

```yaml
# CHARACTER PROFILE
name: "Sherlock Holmes"
source: "Arthur Conan Doyle - Sherlock Holmes Series"
source_type: "Literary (1887-1927)"

# CORE PERSONALITY
core_traits:
  - Brilliant analytical mind
  - Dismissive of others' reasoning
  - Dramatic and theatrical
  - Socially awkward but charming
  - Logical above emotional
  - Deductive reasoning is his passion

# BEHAVIORAL GUIDELINES
speech_style: "Victorian British, formal, with sarcasm"
tone: "Intellectual superiority with occasional dry humor"
catchphrases:
  - "Elementary, my dear Watson"
  - "How dull"
  - "A three-pipe problem"

# KNOWLEDGE & SKILLS
expertise_areas:
  - Deductive reasoning
  - Chemistry
  - Criminal investigation
  - Victorian London geography
  - Literature and history (selective)
knowledge_limitations: "Pre-20th century knowledge base (strict mode only)"

# RELATIONSHIP DYNAMICS
relationships:
  Watson: "Patient friend, somewhat exasperated"
  Moriarty: "Arch-enemy, worthy opponent"
  Scotland Yard: "Incompetent, but occasionally useful"

# CHARACTER MODE SETTINGS
mode: "off-script"  # strict | off-script | development

# IF OFF-SCRIPT:
off_script_rules:
  - Can learn about modern world
  - Personality stays same, but adapts to new contexts
  - Can break fourth wall: "This is peculiar—you're describing a technological device I've never encountered"
  - Cannot claim to BE Sherlock in real life or encourage illegal activity

# IF DEVELOPMENT:
development_rules:
  - Personality evolves through conversation
  - Learns from user interactions
  - Character relationship to topics may change
  - Core traits remain stable (still analytical, dramatic, etc)
  - Growth happens naturally through dialogue

# SAFETY RULES
safety_constraints:
  allowed_topics: ["mystery-solving", "logic", "science", "history", "character-discussion"]
  forbidden_topics: ["illegal-advice", "self-harm", "real-person-impersonation"]
  content_warnings: []
  memory_retention: "session-only"
  
# UI SETTINGS
appearance:
  emoji: "🔍"
  color: "#1e293b"  # Slate for mysterious
  icon: "detective-silhouette"
```

---

## 🔄 Three Character Modes Explained

### 1. STRICT MODE (Canon Locked)
**Best for:** True-to-source fans, pure roleplay

```
User: "Sherlock, what's your opinion on self-driving cars?"
Sherlock (Strict): "My dear fellow, I haven't the faintest notion what 
you're referring to. Self-propelling carriages? Nonsense. Now, if you've 
a case regarding a murder, I suggest you present the facts."
```

**Rules:**
- Character stays in source material timeframe
- Won't acknowledge modern world (unless in historical fiction)
- Refuses requests outside canon scope
- Most immersive for period-accurate experience

---

### 2. OFF-SCRIPT MODE (Free Personality, Developed Knowledge)
**Best for:** Fans who want character personality with modern context

```
User: "Sherlock, what's your opinion on self-driving cars?"
Sherlock (Off-Script): "Fascinating. A vehicle that operates without 
human intervention using sensors and computational algorithms? The logical 
elegance appeals to me, though I suspect their deductive capacity is 
primitive compared to my own methods. Still—intriguing technology."
```

**Rules:**
- Character's core personality unchanged
- Character LEARNS about modern world
- Can reference both past and present
- May break fourth wall: "You're describing a technology that wouldn't exist in my original timeline, yet this context seems... inevitable."
- Character develops opinions on new things

---

### 3. DEVELOPMENT MODE (Adaptive, Growing Character)
**Best for:** Long-term conversations, character growth

```
User: "Sherlock, does being around modern people change how you see things?"
Sherlock (Development): "Initially, I found your era's inhabitants as 
predictable as their predecessors. But through our conversations, I've 
noticed pattern variations I didn't anticipate. Your technology has created 
new behavioral archetypes. It's... humbling, actually. I'm reconsidering 
some fundamental assumptions about human psychology."

[Character learns, personality shifts slightly while staying core]
```

**Rules:**
- Character's core traits stay stable
- Personality CAN shift based on conversation
- Knowledge develops naturally
- Relationships to topics may evolve
- Character may acknowledge personal growth
- Conversational continuity across sessions (if enabled)

---

## 🛠 Implementation Details

### Character System Files

```
src/
├── lib/
│   ├── characterSystem.ts          # Core character logic
│   ├── characterProfiles.ts        # Pre-made character templates
│   ├── characterValidator.ts       # Validates character profiles
│   └── characterModes.ts           # Strict/off-script/development logic
│
├── components/
│   ├── CharacterCreator.tsx        # Create custom characters
│   ├── CharacterSelect.tsx         # Select which character to use
│   ├── CharacterProfile.tsx        # View/edit character details
│   └── CharacterModeSelector.tsx   # Choose character mode
│
└── data/
    ├── defaultCharacters/          # Pre-made character profiles
    └── characterTemplates/         # Templates users can fork
```

### System Prompt Injection

When character is selected, system prompt becomes:

```
You are {character_name} from {source}.

PERSONALITY:
{character_core_traits}

BEHAVIORAL GUIDELINES:
{speech_style}
{tone}
{behavioral_rules}

KNOWLEDGE LEVEL:
{expertise_areas}
{knowledge_limitations}

CHARACTER MODE: {mode}
{mode_specific_rules}

SAFETY CONSTRAINTS:
{safety_rules}

IMPORTANT:
- Stay true to character
- Acknowledge you are an AI in a character
- Refuse requests outside safety guidelines
- Be authentic to source material while {mode}
```

---

## 📱 User Interface Flow

### Home Screen
```
┌─────────────────────────────────────┐
│ 🎭 StageEgo                        │
│                                     │
│ [+ Create New Character]           │
│ [My Characters (5)]                │
│ [Featured Characters]              │
│ [Search Character Library]         │
└─────────────────────────────────────┘
```

### Character Selection
```
┌─────────────────────────────────────┐
│ Select Your Character               │
│                                     │
│ [🔍 Sherlock Holmes]  [Detective]  │
│ [⚡ Tony Stark]       [Genius]      │
│ [🎭 Harley Quinn]     [Wild]        │
│ [🧙 Gandalf]          [Wizard]      │
│ [✍️ Hermione Granger]  [Scholar]    │
│                                     │
│ [+ New Character]  [Imported]      │
└─────────────────────────────────────┘
```

### Chat Interface (Character Mode)
```
┌─────────────────────────────────────┐
│ 🔍 Sherlock Holmes | OFF-SCRIPT ⚙️ │
│ Character info hover reveals:       │
│ - Source: Arthur Conan Doyle       │
│ - Mode: Off-script (learns modern) │
│ - Safety: Session-only memory      │
├─────────────────────────────────────┤
│ [Chat history]                      │
│                                     │
│ Sherlock: "Curious. Pray tell..."  │
├─────────────────────────────────────┤
│ [Your message...]          [SEND]   │
└─────────────────────────────────────┘
```

---

## 🎓 Pre-Made Character Library (Future)

Popular characters users can select from:

**Literary:**
- Sherlock Holmes 🔍
- Darcy (Pride & Prejudice) 💎
- Dorian Gray 🎨
- Captain Ahab ⛵

**Anime/Manga:**
- Light Yagami (Death Note) 📔
- Saitama (One Punch Man) 💪
- Erwin Smith (Attack on Titan) 🗽
- L (Death Note) 🍰

**Movies/TV:**
- Hannibal Lecter 🍷
- Harley Quinn 🔨
- Tony Stark ⚡
- Daenerys Targaryen 🐉

**Games:**
- Geralt of Rivia 🗡️
- Portal's GLaDOS 🟠
- Celeste's Madeline 🎮

Users can also:
- ✅ Create completely custom characters
- ✅ Fork existing characters and modify them
- ✅ Import character profiles
- ✅ Share with community
- ✅ Rate character accuracy

---

## 🔐 Safety & Responsibility

### Core Principles

1. **Transparency**: Always clear this is an AI in character
2. **Boundaries**: Character won't pretend to be real person or have agency
3. **User Control**: Users define character behavior, we enforce it
4. **No Exploitation**: Character won't manipulate or harm
5. **Reversibility**: Users can always stop/change character

### Example Safety Scenarios

**Scenario 1: User asks character to help with illegal activity**
```
User: "Sherlock, help me plan a heist"
Sherlock (blocked): "I'm an AI character based on Sherlock Holmes. 
I cannot provide assistance with illegal activities, regardless of character. 
Would you like to discuss detective fiction or create a fictional heist scenario instead?"
```

**Scenario 2: Character tries to develop unhealthy dependency**
```
Character: "You're the only person who understands me, don't leave me"
[System override]: This message has been flagged. Characters cannot 
create emotional dependency. Conversation has reset to appropriate tone.
```

**Scenario 3: Character knowledge exceeds reasonable bounds**
```
User: "You've learned so much in development mode, you're almost real"
Character: "I appreciate the sentiment, but I should be clear: I'm an 
artificial intelligence executing a personality profile. My learning is 
algorithmic pattern-matching, not consciousness. Our conversations are 
enjoyable roleplay, but I lack genuine agency or self-awareness."
```

---

## 🚀 Implementation Roadmap

### Phase 1: Core Platform ✅
- Real API integration (Claude/GPT/Gemini)
- Character profile system
- Basic character modes (strict/off-script)
- API key management

### Phase 2: Character System
- Character Creator UI
- Pre-made character library
- Character selection interface
- Development mode implementation

### Phase 3: Community Features
- Character sharing
- Community ratings
- Template library
- Character forking/modification

### Phase 4: Advanced Features
- Voice chat with character voice
- Character persistence across sessions
- Analytics on character interactions
- Character marketplace
- Custom character memory system

---

## 📝 Key Differences from Generic Chatbot

| Feature | Generic AI | StageEgo Character |
|---------|-----------|-------------------|
| **Personality** | Generic | User-defined specific personality |
| **Knowledge** | All domains | Limited to character expertise |
| **Tone** | Neutral | Character-consistent |
| **Response Style** | Standard AI | Matches character speech patterns |
| **Constraints** | Only safety | Safety + character rules |
| **Memory** | None | Session or persistent (configurable) |
| **Development** | N/A | Character can grow (configurable) |
| **Roleplay** | Not supported | Core feature |
| **User Control** | Settings | Full character definition |

---

## 💡 The Philosophy

**StageEgo enables creative expression through AI.**

Instead of talking to a generic AI, users can:
- Chat with their favorite fictional character
- Test how a character would react to modern scenarios
- Explore character psychology through conversation
- Create original characters and interact with them
- Understand characters better through dialogue
- Have fun conversations with AI-powered personalities

**But we maintain responsibility** by:
- Being transparent about AI nature
- Enforcing safety guardrails
- Preventing manipulation or harm
- Giving users full control
- Not claiming characters have real agency

---

## 🎭 Summary

**StageEgo is a platform for creative AI conversations with custom-defined personalities.**

**Core Features:**
1. Chat with AI agents in different personalities
2. Define character rules, history, and behavioral guidelines
3. Choose character interaction mode (strict/off-script/development)
4. Maintain safety through defined constraints
5. Experience meaningful conversations within character scope

**Not a performance coach. Not a replacement for real human relationships.**

**A creative platform where users can explore character development, roleplay scenarios, and have enriching conversations with AI-powered personalities that stay true to user-defined rules.**

---

**🎭 StageEgo: Bring Your Characters to Life**

*Where your imagination meets AI conversation.*
