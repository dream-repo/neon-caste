// =====================================================================
// NEON CASTE – Part 1: The Gutter
// ALL dialogue, mission text, NPC lines and cards live in this object.
// Tokens: {they} {them} {their} {They} {Their} {kid} resolve from Charlie's
// rolled gender. Conditions (if:) are evaluated in game.js COND table:
//   lowHum (<50), highHum (>=50), evicted, fought, citizen, hobo, dark,
//   tookCrate, leftCrate
// =====================================================================
const STORY = {
  cast: {
    sable: { name: 'Charlie', col: '#36f3ff', init: 'C' },
    ox:    { name: 'Mama Ox', col: '#ffb347', init: 'O' },
    dex:   { name: 'Dex', col: '#7dff9b', init: 'D' },
    iris:  { name: 'Doc Iris', col: '#c9a0ff', init: 'I' },
    wren:  { name: 'Nero', col: '#ff6b5e', init: 'N' },
    pell:  { name: 'Mr. Pell', col: '#ffd76a', init: 'P' },
    lusa:  { name: 'Lusa Marrow', col: '#9fd3ff', init: 'L' },
    pip:   { name: 'Pip Marrow', col: '#ffe9a8', init: 'P' },
    spire: { name: 'SPIRE VOICE', col: '#ffffff', init: '▲' },
    cop:   { name: 'Block Cop', col: '#8aa4ff', init: 'C' },
    narr:  { name: '', col: '#9aa7b8', init: '' }
  },

  ranks: ['HOBO', 'CITIZEN', 'WARRIOR', 'ELITE', 'RULER'],

  missions: {
    g1: { title: 'Soup Line', giver: 'Mama Ox', desc: 'Junkies are robbing the Ladle\'s soup line. Run them off.' },
    g2: { title: 'Fell Off a Truck', giver: 'Dex', desc: 'Fetch Dex\'s "found" crate from the Scavver yards. Bottles. Dogs.' },
    g3: { title: 'Old Stray', giver: 'Nero', desc: 'Someone keeps beating you to every job. Time to meet them.' },
    proof: { title: 'The Proof', giver: 'Mr. Pell', desc: 'Spire Holdings will print you a Citizen chip. All you have to do is one job.' },
    b1: { title: 'Checkpoint Nine', giver: 'Dex', desc: 'Insulin for Kessel Street is stuck behind a Block Cop checkpoint.' },
    b2: { title: 'Screen Burn', giver: 'Doc Iris', desc: 'A bad ad update hijacked Corridor 12. The Spire is sending a Riot Mech to "pacify" it.' },
    b3: { title: 'One Rung', giver: 'Nero', desc: 'One Warrior slot in the Arena. Two gutter kids want it.' },
    teaser: { title: 'The Next Proof', giver: 'Mr. Pell', desc: 'The Spire has noticed you.' }
  },

  contracts: {
    c_junk:  { name: 'Glimmer Alley', desc: 'Junkies wired on Glimmer. Fast, sloppy, mean.' },
    c_scav:  { name: 'Scavver Yards', desc: 'Scavvers lob bottles from range. Close the gap.' },
    c_hound: { name: 'Hound Runs', desc: 'Cyber-dogs lunge after a flash. Block or dodge it.' },
    c_drone: { name: 'Drone Sweep', desc: 'Enforcer Drones paint you with a laser, then fire. Change lanes.' },
    c_cop:   { name: 'Checkpoint Duty', desc: 'Block Cops shield-block light hits. Charge a HEAVY to break guard.' },
    c_pup:   { name: 'Ad Riot', desc: 'Hacked civilians. EMP mods reset their chips fast.' },
    c_debt:  { name: 'Collections', desc: 'Debt Collectors and shotguns. Never stand still in their lane.' },
    c_mech:  { name: 'Riot Mech', desc: 'Mini-boss. Armored. Heavy hits and EMP crack it open.' }
  },

  scenes: {
    intro: [
      { card: 'SECTOR 9.', sub: 'The Spire rules. Everyone else rents their life.' },
      { s: 'narr', t: 'Rain. The kind that tastes like batteries.' },
      { s: 'narr', t: 'You wake face-down in a gutter on Kessel Street. Pockets inside out. Someone took your shoes, then came back for the laces.' },
      { s: 'ox', t: 'You\'re breathing. Good. That\'s the first rent paid.' },
      { s: 'sable', t: 'Where... who are you?' },
      { s: 'ox', t: 'Mama Ox. I run the Ladle. Soup, a roof with most of the holes patched, and no questions before breakfast.' },
      { s: 'ox', t: 'You got a name, or you want me to read one off a can?' },
      { s: 'sable', t: 'Charlie. Charlie Vance.' },
      { s: 'ox', t: 'Well, Charlie Vance, you have nothing. Down here that makes you a Hobo. Spire\'s word, not mine.' },
      { s: 'ox', t: 'See that tower? Everyone down here is climbing toward it or falling off it. Nobody stands still.' },
      { s: 'ox', t: 'Eat. Then make yourself useful.' }
    ],

    g1_intro: [
      { s: 'ox', t: 'Three junkies keep hitting my soup line. Wired on Glimmer. They take bowls right out of kids\' hands.' },
      { s: 'ox', t: 'Can\'t pay much. Can pay something. Can feed you.' },
      { s: 'sable', t: 'I don\'t have a weapon.' },
      { s: 'ox', t: 'You\'ve got two hands. Down here that\'s a weapon with a waiting list.' }
    ],
    g1_win: [
      { s: 'ox', t: 'Not bad for somebody who woke up in a puddle.' },
      { s: 'ox', t: 'One of them dropped this pipe. It\'s got weight. Use it.' },
      { s: 'ox', t: 'Dex runs the Fence by the dead tram stop. Doc Iris patches people behind the noodle stand. She\'ll put metal in you if you let her.' },
      { s: 'ox', t: 'Don\'t let her too much.' },
      { card: 'CONTRACTS UNLOCKED', sub: 'FIGHT for creds, scrap and gear. Every story job unlocks harder enemies.' }
    ],

    g2_intro: [
      { s: 'dex', t: 'Ox\'s new stray! Look at you. Like a wet cat that learned to punch.' },
      { s: 'dex', t: 'Job. A crate of Spire capacitors fell off a truck. Emotionally, not physically.' },
      { s: 'dex', t: 'It\'s sitting in the Scavver yards. The Scavvers throw bottles. Their dogs are worse.' },
      { s: 'dex', t: 'Bring it back and I\'ll set you up with a piece.' }
    ],
    g2_win: [
      { s: 'narr', t: 'Under Dex\'s crate there\'s a second one. Small handprints all over it. Somebody\'s whole stash: wire, batteries, a doll with one eye.' },
      { choice: [
        { t: 'Sell it to Dex too. (+60 creds, -5 Humanity)', fx: { creds: 60, hum: -5, flag: 'tookCrate' }, go: 'g2_took' },
        { t: 'Leave it for the Scavver kids.', fx: { flag: 'leftCrate' }, go: 'g2_left' }
      ] }
    ],
    g2_took: [
      { s: 'dex', t: 'Business is business. Nobody down here is the Scavvers\' mother.' },
      { s: 'dex', t: 'Here. Rust Pistol. Twelve rounds. Ammo isn\'t free: bring scrap to the bench and press your own.' }
    ],
    g2_left: [
      { s: 'dex', t: 'Sentimental. That gets expensive.' },
      { s: 'dex', t: '...Ox would like you, though. Here. Rust Pistol. Twelve rounds. Ammo isn\'t free: bring scrap to the bench and press your own.' }
    ],

    g3_intro: [
      { s: 'narr', t: 'Every job on Kessel Street this week, someone got there first.' },
      { s: 'wren', t: 'So you\'re Ox\'s new stray. I\'m her old one.' },
      { s: 'wren', t: 'Nero. I\'ve been climbing this ladder since I was nine. I don\'t share rungs.' },
      { s: 'sable', t: 'Ladder\'s big enough.' },
      { s: 'wren', t: 'No. It isn\'t. That\'s the whole point of a ladder.' }
    ],
    g3_win: [
      { s: 'wren', t: '...Fine. You hit like you mean it.' },
      { s: 'wren', t: 'Pell\'s hiring. Spire Holdings\' tenancy man. He hands out Proofs: one job for the Spire, and they print you a Citizen chip.' },
      { s: 'wren', t: 'I\'m doing mine soon. Stay out of my way.' },
      { s: 'ox', t: '{They} put you on your back, Nero. Get up and say thank you.' },
      { s: 'wren', t: 'Thank you for nothing, Ox.' },
      { s: 'ox', t: 'Nero isn\'t cruel. Nero\'s hungry. Down here those look the same, right up until they don\'t.' },
      { s: 'ox', t: 'When Pell gives you your Proof, hear the whole thing. Then go hear whoever it\'s about.' },
      { card: 'THE PROOF', sub: 'Earn Rank XP in fights. When it\'s full, Mr. Pell will see you.' }
    ],

    proof_locked: [
      { s: 'pell', t: 'Spire Holdings doesn\'t interview nobodies. Come back when people on Kessel Street say your name.' }
    ],
    proof_intro: [
      { s: 'pell', t: 'Charlie Vance. Hobo. No fixed address, no chip. And yet people keep saying your name.' },
      { s: 'pell', t: 'Spire Holdings rewards initiative. I\'m offering you a Proof.' },
      { s: 'pell', t: 'Unit 4C, Gantry Row. Squatters. A family of three, two years past due. You remove them, you get a chip.' },
      { s: 'pell', t: 'Citizenship, Charlie. Dry bed. Clean water. A door that locks from your side.' },
      { s: 'sable', t: 'And them?' },
      { s: 'pell', t: '"Them" is not a question the Spire asks.' },
      { s: 'narr', t: 'Unit 4C. A bedsheet for a door. A rice cooker. A child\'s drawing of a sun taped to the wall.' },
      { s: 'lusa', t: 'We know why you\'re here. Pell sends someone every few months. They usually don\'t knock.' },
      { s: 'pip', t: 'Mama, is {they} a Citizen?' },
      { s: 'lusa', t: 'Not yet, baby. That\'s why {they}\'s here.' },
      { choice: [
        { t: 'Tell them to pack.', act: 'evict' },
        { t: 'Hear them out.', go: 'proof_hear' }
      ] }
    ],
    proof_hear: [
      { s: 'lusa', t: 'Teo worked the Spire\'s water plant eleven years. Lung rot. They cancelled his chip the week he couldn\'t stand.' },
      { s: 'lusa', t: 'Pell\'s crew is waiting downstairs. Two bruisers and a collector. If you don\'t do it, they will. They just don\'t do it gently.' },
      { s: 'pip', t: 'You could fight them. You fought Nero. Everybody saw.' },
      { s: 'narr', t: 'Pell wants a Proof. He didn\'t say what you had to prove.' },
      { choice: [
        { t: 'Tell them to pack. (Citizen now, -25 Humanity)', act: 'evict' },
        { t: 'Go downstairs. (Fight Pell\'s crew. Hard.)', act: 'fight', fx: { flag: 'proofHeard' } }
      ] }
    ],
    proof_return: [
      { s: 'narr', t: 'Gantry Row again. Pell\'s crew is still downstairs, and they\'ve been laughing about you.' },
      { choice: [
        { t: 'Tell the Marrows to pack. (-25 Humanity)', act: 'evict' },
        { t: 'Go downstairs. (Fight Pell\'s crew.)', act: 'fight' }
      ] }
    ],
    proof_evict: [
      { s: 'sable', t: 'Ten minutes. Take what you can carry.' },
      { s: 'lusa', t: '...Pip. Get the sun.' },
      { s: 'narr', t: 'They don\'t cry. That\'s the worst part. They\'ve done this before.' },
      { s: 'pell', t: 'Efficient. The Spire notices efficiency. Welcome up, Citizen Vance.' }
    ],
    proof_fight_intro: [
      { s: 'pell', t: 'You\'re making an expensive mistake.' },
      { s: 'sable', t: 'Put it on my tab.' }
    ],
    proof_fight_win: [
      { s: 'pell', t: 'Do you know what happens to people who hit Spire contractors?' },
      { s: 'sable', t: 'Yeah. They get promoted. Sign the chip, Pell.' },
      { s: 'pell', t: '...The Spire values initiative. Fine. FINE. Citizen Vance. Enjoy it while it lasts.' },
      { s: 'lusa', t: 'He\'ll send more. But not tonight. Tonight we sleep here.' },
      { s: 'narr', t: 'Pip peels the sun drawing off the wall and presses it into your hand. "So you remember, up there."' }
    ],
    rankup: [
      { card: 'RANK UP: CITIZEN', sub: 'Your chip is warm in your wrist. It hums when you walk past a door you\'re now allowed through.' }
    ],
    blocks_arrive: [
      { card: 'THE BLOCKS', sub: 'Arcology Ring 3. You can afford the air now. Not much else.' },
      { s: 'spire', t: 'CITIZENSHIP IS A PRIVILEGE. RENT IS FREEDOM. SMILE: YOU ARE BEING SEEN.' },
      { s: 'ox', t: 'Citizen. Huh. Don\'t forget where the Ladle is.', if: 'fought' },
      { s: 'ox', t: 'I heard about Gantry Row. ...Soup\'s still hot, if you ever want it.', if: 'evicted' },
      { s: 'wren', t: 'You beat me to a chip. Don\'t get comfortable. I\'m a week behind you.' }
    ],

    b1_intro: [
      { s: 'dex', t: 'Look at you, a Citizen. Do you get a badge? Do you salute yourself in the mirror?' },
      { s: 'dex', t: 'Checkpoint Nine is choking the Blocks off from the Gutter. Medicine goes up, nothing comes down.' },
      { s: 'dex', t: 'I\'ve got insulin for Ox\'s people stuck on the wrong side.' },
      { s: 'dex', t: 'Block Cops carry shields. Light hits bounce. Charge a HEAVY to break the guard, or get behind them.' }
    ],
    b1_win: [
      { s: 'dex', t: 'Insulin\'s moving. You just did more for Kessel Street than the Spire has in a decade. With a stick.' },
      { s: 'cop', t: '(into radio) Sarge, {they}\'s chipped. {They}\'s a Citizen. Do I still arrest {them}?' },
      { s: 'cop', t: '(groaning) ...you\'re a Citizen. Why do you care what happens down there?' },
      { s: 'sable', t: 'I was down there last week.' }
    ],
    b2_intro: [
      { s: 'iris', t: 'Someone pushed a bad update to the SmileFeed ad chips. Half of Corridor 12 is walking around with an ad screaming inside their skull.' },
      { s: 'iris', t: 'They aren\'t violent. The firmware is. Knock them down and the chip resets. Don\'t make it worse.' },
      { s: 'iris', t: 'The Spire is sending a Riot Mech to "pacify" the corridor. Pacify means something else when it\'s seven feet of hydraulics.' }
    ],
    b2_win: [
      { s: 'iris', t: 'Forty-one people with their own thoughts back. No one\'s going to thank you. Most of them won\'t remember.' },
      { s: 'iris', t: 'You did that fast. Too fast. How much of you is still doing the deciding?', if: 'lowHum' },
      { s: 'iris', t: 'You know what the Spire pays for one Riot Mech? More than this corridor earns in a year. Think about who that math is for.', if: 'highHum' }
    ],
    b3_intro: [
      { s: 'wren', t: 'Citizen Vance. Look at us. Two gutter rats in clean jackets.' },
      { s: 'wren', t: 'I saw the Marrows on the Gantry overpass, their whole life in a cart. Pip still had that sun drawing. That was you.', if: 'evicted' },
      { s: 'wren', t: 'You beat Pell\'s crew for a family you didn\'t know. Stupid. ...I keep thinking I\'d have done the same. I didn\'t.', if: 'fought' },
      { s: 'wren', t: 'My Proof was a man named Halvorsen. I don\'t talk about Halvorsen.' },
      { s: 'wren', t: 'Your eyes do the chrome thing now. Like you\'re reading a price tag on me.', if: 'lowHum' },
      { s: 'wren', t: 'You still look like you. How? Everyone who climbs starts looking like the Spire.', if: 'highHum' },
      { s: 'wren', t: 'Pell has one Warrior slot in the Arena this season. One. So here\'s the ladder again, Charlie.' }
    ],
    b3_win: [
      { s: 'wren', t: '...Go on, then. Take the slot.' },
      { s: 'sable', t: 'I don\'t want your slot. I want to know who built a ladder with one rung.' },
      { s: 'wren', t: 'That\'s a dangerous question for a Citizen.' },
      { s: 'wren', t: 'Everyone up there started down here. They just forgot. Promise me you won\'t.' }
    ],
    teaser: [
      { s: 'pell', t: 'Citizen Vance. The Arena has noticed you. The Spire has noticed you.' },
      { s: 'pell', t: 'Your Warrior Proof is simple. There is an unlicensed food operation on Kessel Street. The Ladle.' },
      { s: 'pell', t: 'Close it. Permanently.' },
      { s: 'narr', t: 'Twelve floors down, Mama Ox is ladling soup into a kid\'s bowl. She doesn\'t know yet.' },
      { s: 'ox', t: 'Two ways up a ladder, Charlie. You climb it like the ones above you did...' },
      { s: 'ox', t: '...or you burn it, and build stairs.' },
      { s: 'narr', t: 'Your Humanity is gone. The Spire already thinks it knows which way you\'ll climb.', if: 'dark' },
      { card: 'TO BE CONTINUED', sub: 'WARRIOR', big: true }
    ],

    lose_hobo: [ { s: 'ox', t: 'Dragged you out of the alley by your collar. Somebody lightened your pockets first. Eat. Try again.' } ],
    lose_citizen: [ { s: 'iris', t: 'Your chip pinged my clinic when your vitals dropped. Patch fee came out of your account. Citizens pay for everything.' } ]
  },

  // Hub chatter. Keyed by NPC -> rank -> warm/cold (Humanity >= 50 / < 50)
  talk: {
    ox: {
      hobo: { warm: ['Bowl\'s on the counter. Eat before Nero does.', 'Every Spire tower was poured by somebody from down here. Remember that.', 'You got a soft way of hitting hard. Keep the soft part.'],
              cold: ['...Bowl\'s on the counter.', 'You\'re getting that look. The one people get right before they forget my name.'] },
      citizen: { warm: ['A Citizen eating at the Ladle. The neighbors will talk. Let them.', 'They give you a door that locks. Don\'t forget who\'s on the other side of it.'],
                 cold: ['You eat like you\'re doing me a favor now.', 'I fed you when you had nothing. I\'d do it again. I\'m not sure you would.'] }
    },
    dex: {
      hobo: { warm: ['Everything\'s for sale except my opinion, which is free and correct.', 'You want a better gun, bring better money. That\'s the whole economy.'],
              cold: ['Discount for you. Not because I like you. Because you make people nervous.', 'You\'re scaring the customers, Charlie. Good for business, bad for my nerves.'] },
      citizen: { warm: ['Citizen markup. Don\'t look at me like that, the Spire taxes my feelings.', 'Better stock up here. Everyone in the Blocks has money and no taste.'],
                 cold: ['Fine, fine, cheaper. Just stop looking at me with those eyes.', 'You used to haggle. Now you just stand there until I lower it.'] }
    },
    iris: {
      hobo: { warm: ['Every implant costs a piece of you. I just do the paperwork.', 'Metal doesn\'t make you strong. It makes you expensive.'],
              cold: ['Not much left in there to cut around, Charlie.', 'I\'m charging you more. Call it a conscience fee.'] },
      citizen: { warm: ['Citizen rates. The Spire takes half. I take the other half and buy bandages for the Gutter.', 'Corridor 12 still asks about you. The ones who remember.'],
                 cold: ['Sit. Don\'t talk. You don\'t, much, anymore.', 'You\'re the third client this month who stopped feeling cold. That\'s not a feature.'] }
    },
    wren: {
      hobo: { warm: ['Stay off my jobs, stray.', 'Ox likes you. Ox likes everyone. Don\'t let it go to your head.'],
              cold: ['You\'re climbing fast. Watch what you step on.', 'Even I don\'t hit people that hard. Huh.'] },
      citizen: { warm: ['Clean jacket. Same gutter eyes. I like that.', 'I got my chip. Feels like a leash with better lighting.'],
                 cold: ['You and Pell would get along now. That\'s not a compliment.', 'I used to want to be you. Now I\'m not sure.'] }
    }
  },

  // Small lines shown at fight start / results
  fightStart: {
    gutter: ['Rain on the pipes. Someone\'s waiting.', 'Kessel Street doesn\'t sleep. It just waits.', 'Fire barrels. Bad lighting. Worse company.'],
    blocks: ['SMILE: YOU ARE BEING SEEN.', 'The ad screens never blink. Neither do the cops.', 'Ring 3 air smells like lemon and bleach.']
  },
  loseLine: 'K.O. Someone drags you back to the hub. Your pockets feel lighter.',
  winLine: 'CLEAR'
};
