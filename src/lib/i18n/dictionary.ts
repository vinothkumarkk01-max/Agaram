import type { Locale } from "./locale";

/**
 * The V1 Tamil-language UI toggle (see build plan Section 3 / 5).
 * Deliberately NOT covered here, on purpose — see the README section
 * this feature ships with for why:
 * - `/admin` (layout, nav, reports, verifications) — founder-only
 *   tooling, never seen by a member.
 * - `/privacy` — legal/DPDP-Act text; auto-translating consent and
 *   compliance language without a native-speaker + legal review pass
 *   is a worse outcome than leaving it in the one language that's
 *   actually been reviewed so far. Stays English-only until that
 *   review happens (same flag the build plan already carries for the
 *   English text itself).
 *
 * Every other member-facing screen is covered. `en` is the source of
 * truth for the *shape* of the dictionary — `ta` is typed against it
 * (`satisfies Dictionary`), so a key added to one without the other is
 * a type error caught by `tsc`, not a silent fallback to English at
 * runtime.
 *
 * Every value here is a plain string — deliberately, no functions,
 * even for the handful of strings that need a name/date/email spliced
 * in (those are split into `xPrefix`/`xSuffix` pairs, composed with a
 * template literal at the call site instead). This dictionary gets
 * passed as a prop to several Client Components (forms, the message
 * thread, the language toggle's siblings), and React's server/client
 * boundary can only serialize plain data across it — a function
 * anywhere in the object throws "Functions cannot be passed directly
 * to Client Components" at runtime, for every consumer of this file,
 * not just the one that happens to use that function. Keep it
 * plain-strings-only; if a new string needs interpolation, add a
 * prefix/suffix pair rather than a function.
 */
const en = {
  common: {
    brand: "Agaram Premium",
    backDashboard: "← Dashboard",
    back: "← Back",
    privacyPolicy: "Privacy Policy",
    backToDashboard: "Back to dashboard",
  },
  landing: {
    tagline:
      "Project scaffold — auth pipes are live. Sign up to try it end to end.",
    createAccount: "Create account",
    signIn: "Sign in",
  },
  auth: {
    createTitle: "Create your account",
    welcomeBack: "Welcome back",
    createSubtitle: "Start with your email — you can add everything else after.",
    loginSubtitle: "Sign in to continue to your account.",
    email: "Email",
    password: "Password",
    passwordPlaceholder: "At least 8 characters",
    pleaseWait: "Please wait…",
    createAccountBtn: "Create account",
    signInBtn: "Sign in",
    alreadyHaveAccount: "Already have an account?",
    signInLink: "Sign in",
    newToAgaram: "New to Agaram?",
    createAnAccount: "Create an account",
    agreeToPolicyPrefix: "By creating an account, you agree to our ",
    agreeToPolicySuffix: ".",
  },
  dashboard: {
    signedIn: "Signed in",
    setupTitle: "Let's set up your profile.",
    setupSubtitle:
      "Two short steps — your basic details, then your match preferences.",
    completeProfile: "Complete your profile",
    almostDonePrefix: "Almost done, ",
    almostDoneSuffix: ".",
    almostDoneSubtitle: "One more step: tell us who you're looking for.",
    setPreferences: "Set your preferences",
    groom: "Groom",
    bride: "Bride",
    years: "years",
    lookingFor: "Looking for",
    anyEducation: "Any education",
    bachelorsPlus: "Bachelor's+",
    identityVerified: "✓ Identity verified",
    identityPending: "Identity check pending",
    identityNotVerified: "Identity not verified yet",
    checkStatus: "Check status",
    verifyNow: "Verify now",
    browseMatches: "Browse matches",
    verifyToUnlock: "Verify your identity to unlock the matching feed.",
    eliteUntilPrefix: "Elite · until ",
    eliteUntilSuffix: "",
    freePlan: "Free plan",
    upgradeToElite: "Upgrade to Elite",
    editProfile: "Edit profile",
    accountPrivacy: "Account & privacy",
    adminDashboard: "Admin dashboard",
    signOut: "Sign out",
    language: "Language",
  },
  onboarding: {
    stepChipBasicInfo: "Day 1 · Step 2 of 3",
    stepChipPreferences: "Day 1 · Step 3 of 3",
    stepChipIdentity: "Identity check",
    eyebrowAlmostThere: "Almost there",
    eyebrowBuildTrust: "Build trust",
    eyebrowAllSet: "All set",
    basicInfoTitle: "Tell us about yourself.",
    basicInfoLede:
      "A few basics so matches know who they're meeting. Who you're looking for comes next — this is just about you.",
    preferencesTitle: "Who are you looking for?",
    preferencesLede:
      "Distinct from who you are — these are your must-haves for a match.",
    verifiedTitle: "Your identity is verified.",
    verifiedLede:
      "Members see this as a Verified badge on your profile — it's one of the first things that builds trust.",
    verifiedViaAadhaarBase: "Verified via Aadhaar",
    verifiedViaAadhaarEndingPrefix: " ending ",
    verifiedViaAadhaarEndingSuffix: "",
    goToDashboard: "Go to your dashboard",
    pendingTitle: "Verifying your identity…",
    pendingLede: "This usually takes a few seconds. Don't close this tab.",
    checkingDetails: "Checking your details…",
    unverifiedTitle: "Verify your identity.",
    unverifiedLede:
      "A quick Aadhaar check adds a Verified badge to your profile — members trust verified profiles more.",
    fullName: "Full name",
    fullNamePlaceholder: "Your name",
    iAmA: "I am a",
    age: "Age",
    city: "City",
    cityHelp:
      "Used to match you with candidates in — or open to — your area.",
    aboutLine: "A line about you",
    optional: "(optional)",
    aboutPlaceholder: "Enjoys long-distance running, close to family…",
    saving: "Saving…",
    continueBtn: "Continue",
    basicInfoFooter:
      "Next: your must-have preferences — identity and other checks come after.",
    any: "Any",
    yes: "Yes",
    maybe: "Maybe",
    no: "No",
    ageRange: "Age range",
    min: "Min",
    max: "Max",
    preferredLocations: "Preferred location(s)",
    preferredLocationsPlaceholder: "Chennai, Bengaluru, Coimbatore",
    educationLevel: "Education level",
    professionField: "Profession / field",
    professionPlaceholder: "Open to any field",
    openToRelocating: "Open to relocating",
    language: "Language",
    languagePlaceholder: "Tamil, English",
    seeWhatsNext: "See what's next",
    preferencesFooter:
      "You can add more preferences (family, lifestyle, cultural) any time.",
    aadhaarNumber: "Aadhaar number",
    aadhaarHelp:
      "We only ever store the last 4 digits. Your full number is used once, for this check, and then discarded.",
    consentLabel:
      "I consent to Agaram verifying my identity using the Aadhaar number above, in line with the DPDP Act, 2023.",
    submitting: "Submitting…",
    verifyMyIdentity: "Verify my identity",
    mockNote:
      "This is a mock check for now — see below for what changes when the real verification vendor is connected.",
  },
  matches: {
    title: "Matches",
    subtitle:
      "Simple, rules-based introductions for this V0 — matched on age range and location. Names stay masked until you both say yes.",
    tabBrowse: "Browse",
    tabSent: "Sent",
    tabReceived: "Received",
    tabMutual: "Mutual",
    pass: "Pass",
    interested: "Interested",
    noCandidates:
      "No new candidates match your preferences right now — check back soon, or widen your preferences.",
    noSent:
      "You haven't expressed interest in anyone yet — head to Browse to get started.",
    mutualSeeTab: "Mutual — see Mutual tab",
    waitingResponse: "Waiting for a response",
    noReceived: "No one's expressed interest yet — they'll show up here.",
    decline: "Decline",
    accept: "Accept",
    block: "Block",
    noMutual:
      "No mutual matches yet — once you and someone else are both interested, they'll unlock here.",
    message: "Message",
    itsAMatch: "It's a match! 🎉",
    upgradeToSeeMessage: "Upgrade to Elite to see their name and message them.",
    upgradeToEliteBtn: "Upgrade to Elite",
    backMutual: "← Mutual",
    report: "Report",
    upgradeToMessage: "Upgrade to Elite to message your mutual matches.",
    conversationUnavailable: "This conversation isn't available.",
    backToMutual: "Back to Mutual",
    sayHello: "Say hello — you're a mutual match!",
    typeMessage: "Type a message…",
    send: "Send",
    backToConversation: "← Back to conversation",
    alreadyReportedPrefix: "You've already reported this conversation, on ",
    alreadyReportedSuffix: ". Our team will review it.",
    reportTitle: "Report this conversation",
    reportSubtitle:
      "Tell us what happened. This goes straight to the team running Agaram, not to the other member.",
    whatHappened: "What happened?",
    submitReport: "Submit report",
  },
  account: {
    yourAccount: "Your account",
    downloadData: "Download your data",
    downloadDataDesc:
      "Everything Agaram has stored about you — profile, preferences, identity verification status, payment history, matches, messages, and reports you've filed — as a single JSON file.",
    downloadMyData: "Download my data",
    blockedMembers: "Blocked members",
    noBlocked: "You haven't blocked anyone.",
    unblock: "Unblock",
    deleteAccount: "Delete your account",
    deleteAccountDesc:
      "Permanent, and immediate. See the checkbox below for exactly what this removes.",
    understandCheckbox:
      "I understand this permanently deletes my profile, matches, messages, and payment history — for the other person in any match too — and can't be undone.",
    typeToConfirmPrefix: "Type ",
    typeToConfirmSuffix: " to confirm",
    deleting: "Deleting…",
    permanentlyDelete: "Permanently delete my account",
  },
  upgrade: {
    youreOnElite: "You're on Elite.",
    activeUntilPrefix: "Active until ",
    activeUntilSuffix:
      ". Mutual matches unlock automatically, and you'll be able to message once messaging ships.",
    eliteLabel: "Elite",
    eliteTitle: "A serious search, without the endless scrolling.",
    pricing: "₹15,000 for 6 months.",
    benefit1: "✓ Full profile — name and about-me — once you're a mutual match",
    benefit2: "✓ In-app messaging, once it ships",
    benefit3: "✓ Everything in Free: browsing, verification, expressing interest",
    oneTimeNote: "6 months from purchase, one-time payment — no auto-renewal in this V0.",
    upgradeButtonLabel: "Upgrade to Elite — ₹15,000 / 6 months",
    openingCheckout: "Opening checkout…",
    checkoutLoadError:
      "Couldn't load the checkout — check your connection and try again.",
  },
  errors: {
    somethingWrong: "Something went wrong.",
    errorSubtitleBase: "That's on us, not you — it's already been reported.",
    errorSubtitleReferencePrefix: " (Reference: ",
    errorSubtitleReferenceSuffix: ")",
    tryAgain: "Try again",
    pageNotFound: "Page not found.",
    pageNotFoundDesc: "That page doesn't exist, or has moved.",
    couldntLoad: "Agaram couldn't load.",
  },
};

export type Dictionary = typeof en;

const ta: Dictionary = {
  common: {
    brand: "Agaram Premium",
    backDashboard: "← டாஷ்போர்டு",
    back: "← பின்",
    privacyPolicy: "தனியுரிமைக் கொள்கை",
    backToDashboard: "டாஷ்போர்டுக்குத் திரும்பு",
  },
  landing: {
    tagline:
      "திட்ட அடித்தளம் — உள்நுழைவு அமைப்பு இயங்குகிறது. முழுமையாக முயற்சிக்க பதிவு செய்யவும்.",
    createAccount: "கணக்கு உருவாக்கு",
    signIn: "உள்நுழை",
  },
  auth: {
    createTitle: "உங்கள் கணக்கை உருவாக்கவும்",
    welcomeBack: "மீண்டும் வருக",
    createSubtitle: "உங்கள் மின்னஞ்சலில் தொடங்குங்கள் — மற்ற விவரங்களை பின்னர் சேர்க்கலாம்.",
    loginSubtitle: "உங்கள் கணக்கிற்குத் தொடர உள்நுழையவும்.",
    email: "மின்னஞ்சல்",
    password: "கடவுச்சொல்",
    passwordPlaceholder: "குறைந்தது 8 எழுத்துகள்",
    pleaseWait: "காத்திருக்கவும்…",
    createAccountBtn: "கணக்கு உருவாக்கு",
    signInBtn: "உள்நுழை",
    alreadyHaveAccount: "ஏற்கனவே கணக்கு உள்ளதா?",
    signInLink: "உள்நுழை",
    newToAgaram: "அகரத்தில் புதியவரா?",
    createAnAccount: "கணக்கு உருவாக்கவும்",
    agreeToPolicyPrefix: "கணக்கை உருவாக்குவதன் மூலம், நீங்கள் எங்கள் ",
    agreeToPolicySuffix: "-ஐ ஏற்றுக்கொள்கிறீர்கள்.",
  },
  dashboard: {
    signedIn: "உள்நுழைந்துள்ளீர்கள்",
    setupTitle: "உங்கள் சுயவிவரத்தை அமைப்போம்.",
    setupSubtitle:
      "இரண்டு எளிய படிகள் — முதலில் உங்கள் அடிப்படை விவரங்கள், பின்னர் உங்கள் இணை விருப்பங்கள்.",
    completeProfile: "உங்கள் சுயவிவரத்தை முடிக்கவும்",
    almostDonePrefix: "இன்னும் சற்று, ",
    almostDoneSuffix: ".",
    almostDoneSubtitle: "இன்னும் ஒரு படி: நீங்கள் யாரைத் தேடுகிறீர்கள் என்று கூறுங்கள்.",
    setPreferences: "உங்கள் விருப்பங்களை அமைக்கவும்",
    groom: "மணமகன்",
    bride: "மணமகள்",
    years: "வயது",
    lookingFor: "தேடுகிறவர்",
    anyEducation: "எந்த கல்வியும்",
    bachelorsPlus: "பட்டப்படிப்பு+",
    identityVerified: "✓ அடையாளம் உறுதிசெய்யப்பட்டது",
    identityPending: "அடையாள சரிபார்ப்பு நடைபெறுகிறது",
    identityNotVerified: "அடையாளம் இன்னும் உறுதிசெய்யப்படவில்லை",
    checkStatus: "நிலையைப் பார்க்கவும்",
    verifyNow: "இப்போது உறுதிசெய்யவும்",
    browseMatches: "இணைகளைப் பார்வையிடு",
    verifyToUnlock: "இணைப் பட்டியலைத் திறக்க உங்கள் அடையாளத்தை உறுதிசெய்யவும்.",
    eliteUntilPrefix: "எலீட் · ",
    eliteUntilSuffix: " வரை",
    freePlan: "இலவச திட்டம்",
    upgradeToElite: "எலீட் ஆக மேம்படுத்தவும்",
    editProfile: "சுயவிவரத்தைத் திருத்து",
    accountPrivacy: "கணக்கு & தனியுரிமை",
    adminDashboard: "நிர்வாக டாஷ்போர்டு",
    signOut: "வெளியேறு",
    language: "மொழி",
  },
  onboarding: {
    stepChipBasicInfo: "நாள் 1 · படி 2 / 3",
    stepChipPreferences: "நாள் 1 · படி 3 / 3",
    stepChipIdentity: "அடையாள சரிபார்ப்பு",
    eyebrowAlmostThere: "இன்னும் சற்று",
    eyebrowBuildTrust: "நம்பிக்கையை உருவாக்கு",
    eyebrowAllSet: "எல்லாம் தயார்",
    basicInfoTitle: "உங்களைப் பற்றி கூறுங்கள்.",
    basicInfoLede:
      "இணைகள் யாரைச் சந்திக்கிறோம் என்று அறிய சில அடிப்படை விவரங்கள். நீங்கள் யாரைத் தேடுகிறீர்கள் என்பது அடுத்தது — இது உங்களைப் பற்றி மட்டும்.",
    preferencesTitle: "நீங்கள் யாரைத் தேடுகிறீர்கள்?",
    preferencesLede:
      "நீங்கள் யார் என்பதிலிருந்து வேறுபட்டது — இவை இணைக்கான உங்கள் கட்டாய விருப்பங்கள்.",
    verifiedTitle: "உங்கள் அடையாளம் உறுதிசெய்யப்பட்டது.",
    verifiedLede:
      "இது உங்கள் சுயவிவரத்தில் ஒரு 'உறுதிசெய்யப்பட்டது' குறியீடாகத் தெரியும் — நம்பிக்கையை உருவாக்கும் முதல் விஷயங்களில் ஒன்று.",
    verifiedViaAadhaarBase: "ஆதார் மூலம் உறுதிசெய்யப்பட்டது",
    verifiedViaAadhaarEndingPrefix: " (இறுதி 4: ",
    verifiedViaAadhaarEndingSuffix: ")",
    goToDashboard: "உங்கள் டாஷ்போர்டுக்குச் செல்லவும்",
    pendingTitle: "உங்கள் அடையாளத்தை சரிபார்க்கிறது…",
    pendingLede: "இது பொதுவாக சில நொடிகள் ஆகும். இந்தத் தாவலை மூடாதீர்கள்.",
    checkingDetails: "உங்கள் விவரங்களை சரிபார்க்கிறது…",
    unverifiedTitle: "உங்கள் அடையாளத்தை உறுதிசெய்யவும்.",
    unverifiedLede:
      "ஒரு விரைவான ஆதார் சரிபார்ப்பு உங்கள் சுயவிவரத்தில் 'உறுதிசெய்யப்பட்டது' குறியீட்டைச் சேர்க்கும் — உறுதிசெய்யப்பட்ட சுயவிவரங்களை உறுப்பினர்கள் அதிகம் நம்புவார்கள்.",
    fullName: "முழுப்பெயர்",
    fullNamePlaceholder: "உங்கள் பெயர்",
    iAmA: "நான் ஒரு",
    age: "வயது",
    city: "நகரம்",
    cityHelp: "உங்கள் பகுதியில் — அல்லது அதற்குத் திறந்த — வேட்பாளர்களுடன் இணைக்க பயன்படுகிறது.",
    aboutLine: "உங்களைப் பற்றி ஒரு வரி",
    optional: "(விருப்பத்தேர்வு)",
    aboutPlaceholder: "நீண்ட தூர ஓட்டத்தை விரும்புவார், குடும்பத்துடன் நெருக்கமானவர்…",
    saving: "சேமிக்கிறது…",
    continueBtn: "தொடரவும்",
    basicInfoFooter: "அடுத்து: உங்கள் கட்டாய விருப்பங்கள் — அடையாளச் சரிபார்ப்பு பின்னர் வரும்.",
    any: "எதுவும்",
    yes: "ஆம்",
    maybe: "இருக்கலாம்",
    no: "இல்லை",
    ageRange: "வயது வரம்பு",
    min: "குறைந்தது",
    max: "அதிகபட்சம்",
    preferredLocations: "விருப்பமான இடங்கள்",
    preferredLocationsPlaceholder: "சென்னை, பெங்களூரு, கோயம்புத்தூர்",
    educationLevel: "கல்வித் தகுதி",
    professionField: "தொழில் / துறை",
    professionPlaceholder: "எந்த துறையும் ஏற்றுக்கொள்ளத்தக்கது",
    openToRelocating: "இடம் மாற இருப்பு",
    language: "மொழி",
    languagePlaceholder: "தமிழ், ஆங்கிலம்",
    seeWhatsNext: "அடுத்து என்ன என்று பார்க்கவும்",
    preferencesFooter: "குடும்பம், வாழ்க்கை முறை, கலாச்சாரம் தொடர்பான விருப்பங்களை எப்போது வேண்டுமானாலும் சேர்க்கலாம்.",
    aadhaarNumber: "ஆதார் எண்",
    aadhaarHelp:
      "நாங்கள் இறுதி 4 இலக்கங்களை மட்டுமே சேமிக்கிறோம். உங்கள் முழு எண் இந்தச் சரிபார்ப்புக்காக ஒரு முறை பயன்படுத்தப்பட்டு பின்னர் அழிக்கப்படும்.",
    consentLabel:
      "மேலே உள்ள ஆதார் எண்ணைப் பயன்படுத்தி, DPDP சட்டம், 2023-க்கு இணங்க, அகரம் என் அடையாளத்தை சரிபார்க்க நான் ஒப்புதல் அளிக்கிறேன்.",
    submitting: "சமர்ப்பிக்கிறது…",
    verifyMyIdentity: "என் அடையாளத்தை உறுதிசெய்",
    mockNote:
      "இது இப்போதைக்கு ஒரு போலிச் சோதனை — உண்மையான சரிபார்ப்பு நிறுவனம் இணைக்கப்படும் போது என்ன மாறும் என்பதை கீழே பார்க்கவும்.",
  },
  matches: {
    title: "இணைகள்",
    subtitle:
      "இந்த V0-க்கான எளிய, விதி அடிப்படையிலான அறிமுகங்கள் — வயது வரம்பு மற்றும் இடத்தின் அடிப்படையில் இணைக்கப்படுகின்றன. இருவரும் ஆம் என்று சொல்லும் வரை பெயர்கள் மறைக்கப்பட்டிருக்கும்.",
    tabBrowse: "பார்வையிடு",
    tabSent: "அனுப்பியவை",
    tabReceived: "பெறப்பட்டவை",
    tabMutual: "இருதரப்பு",
    pass: "தவிர்",
    interested: "ஆர்வம் உள்ளது",
    noCandidates:
      "இப்போது உங்கள் விருப்பங்களுக்கு பொருந்தும் புதிய வேட்பாளர்கள் இல்லை — சிறிது நேரம் கழித்து பார்க்கவும், அல்லது உங்கள் விருப்பங்களை விரிவாக்கவும்.",
    noSent: "நீங்கள் இன்னும் யாரிடமும் ஆர்வம் தெரிவிக்கவில்லை — தொடங்க 'பார்வையிடு' தாவலுக்குச் செல்லவும்.",
    mutualSeeTab: "இருதரப்பு — 'இருதரப்பு' தாவலைப் பார்க்கவும்",
    waitingResponse: "பதிலுக்காக காத்திருக்கிறது",
    noReceived: "இன்னும் யாரும் ஆர்வம் தெரிவிக்கவில்லை — அவர்கள் இங்கே தெரிவார்கள்.",
    decline: "நிராகரி",
    accept: "ஏற்றுக்கொள்",
    block: "தடு",
    noMutual:
      "இன்னும் இருதரப்பு இணைகள் இல்லை — நீங்களும் மற்றவரும் ஆர்வம் காட்டியதும், அவை இங்கே திறக்கும்.",
    message: "செய்தி அனுப்பு",
    itsAMatch: "இது ஒரு இணை! 🎉",
    upgradeToSeeMessage: "அவர்களின் பெயரைப் பார்க்கவும் செய்தி அனுப்பவும் எலீட் ஆக மேம்படுத்தவும்.",
    upgradeToEliteBtn: "எலீட் ஆக மேம்படுத்தவும்",
    backMutual: "← இருதரப்பு",
    report: "புகார்",
    upgradeToMessage: "உங்கள் இருதரப்பு இணைகளுக்கு செய்தி அனுப்ப எலீட் ஆக மேம்படுத்தவும்.",
    conversationUnavailable: "இந்த உரையாடல் கிடைக்கவில்லை.",
    backToMutual: "இருதரப்புக்குத் திரும்பு",
    sayHello: "வணக்கம் சொல்லுங்கள் — நீங்கள் ஒரு இருதரப்பு இணை!",
    typeMessage: "செய்தியை உள்ளிடவும்…",
    send: "அனுப்பு",
    backToConversation: "← உரையாடலுக்குத் திரும்பு",
    alreadyReportedPrefix: "இந்த உரையாடலை நீங்கள் ஏற்கனவே ",
    alreadyReportedSuffix: " அன்று புகாரளித்துவிட்டீர்கள். எங்கள் குழு அதை மதிப்பாய்வு செய்யும்.",
    reportTitle: "இந்த உரையாடலைப் புகாரளி",
    reportSubtitle:
      "என்ன நடந்தது என்று சொல்லுங்கள். இது அகரத்தை நடத்தும் குழுவிற்கு நேரடியாகச் செல்கிறது, மற்ற உறுப்பினருக்கு அல்ல.",
    whatHappened: "என்ன நடந்தது?",
    submitReport: "புகாரை சமர்ப்பி",
  },
  account: {
    yourAccount: "உங்கள் கணக்கு",
    downloadData: "உங்கள் தரவைப் பதிவிறக்கவும்",
    downloadDataDesc:
      "அகரம் உங்களைப் பற்றி சேமித்திருக்கும் அனைத்தும் — சுயவிவரம், விருப்பங்கள், அடையாள சரிபார்ப்பு நிலை, பணம் செலுத்திய வரலாறு, இணைகள், செய்திகள், நீங்கள் தாக்கல் செய்த புகார்கள் — ஒரு JSON கோப்பாக.",
    downloadMyData: "என் தரவைப் பதிவிறக்கு",
    blockedMembers: "தடுக்கப்பட்டவர்கள்",
    noBlocked: "நீங்கள் யாரையும் தடுக்கவில்லை.",
    unblock: "தடையை நீக்கு",
    deleteAccount: "உங்கள் கணக்கை நீக்கு",
    deleteAccountDesc: "நிரந்தரமானது, உடனடியானது. இது சரியாக என்ன நீக்கும் என்பதை கீழே உள்ள சரிபார்ப்புப் பெட்டியில் காணலாம்.",
    understandCheckbox:
      "இது என் சுயவிவரம், இணைகள், செய்திகள், பணம் செலுத்திய வரலாற்றை நிரந்தரமாக நீக்கும் என்பதை — எந்த இணையிலும் உள்ள மற்றவருக்கும் — புரிந்துகொள்கிறேன், இதை மீட்டெடுக்க முடியாது.",
    typeToConfirmPrefix: "உறுதிசெய்ய ",
    typeToConfirmSuffix: " என்று தட்டச்சு செய்யவும்",
    deleting: "நீக்குகிறது…",
    permanentlyDelete: "என் கணக்கை நிரந்தரமாக நீக்கு",
  },
  upgrade: {
    youreOnElite: "நீங்கள் எலீட் திட்டத்தில் உள்ளீர்கள்.",
    activeUntilPrefix: "",
    activeUntilSuffix:
      " வரை செயலில் உள்ளது. இருதரப்பு இணைகள் தானாகவே திறக்கும், செய்தி அனுப்பும் வசதி வந்ததும் நீங்கள் செய்தி அனுப்பலாம்.",
    eliteLabel: "எலீட்",
    eliteTitle: "முடிவற்ற ஸ்க்ரோலிங் இல்லாமல், இலக்கு நோக்கிய தேடல்.",
    pricing: "6 மாதங்களுக்கு ₹15,000.",
    benefit1: "✓ முழு சுயவிவரம் — பெயரும் உங்களைப் பற்றியும் — இருதரப்பு இணையான உடனே",
    benefit2: "✓ செயலிக்குள் செய்தி அனுப்பும் வசதி, வந்ததும்",
    benefit3: "✓ இலவசத்தில் உள்ள அனைத்தும்: பார்வையிடுதல், சரிபார்ப்பு, ஆர்வம் தெரிவித்தல்",
    oneTimeNote: "வாங்கிய நாளிலிருந்து 6 மாதங்கள், ஒரு முறை கட்டணம் — இந்த V0-இல் தானியங்கி புதுப்பித்தல் இல்லை.",
    upgradeButtonLabel: "எலீட் ஆக மேம்படுத்தவும் — ₹15,000 / 6 மாதங்கள்",
    openingCheckout: "செக்அவுட் திறக்கிறது…",
    checkoutLoadError: "செக்அவுட்டை ஏற்ற முடியவில்லை — உங்கள் இணைப்பைச் சரிபார்த்து மீண்டும் முயற்சிக்கவும்.",
  },
  errors: {
    somethingWrong: "ஏதோ தவறு நடந்தது.",
    errorSubtitleBase:
      "இது எங்கள் தவறு, உங்களுடையது அல்ல — இது ஏற்கனவே தெரிவிக்கப்பட்டுவிட்டது.",
    errorSubtitleReferencePrefix: " (குறிப்பு: ",
    errorSubtitleReferenceSuffix: ")",
    tryAgain: "மீண்டும் முயற்சி",
    pageNotFound: "பக்கம் கிடைக்கவில்லை.",
    pageNotFoundDesc: "அந்தப் பக்கம் இல்லை, அல்லது நகர்த்தப்பட்டுள்ளது.",
    couldntLoad: "அகரம் ஏற்ற முடியவில்லை.",
  },
} satisfies Dictionary;

export const dictionaries: Record<Locale, Dictionary> = { en, ta };
