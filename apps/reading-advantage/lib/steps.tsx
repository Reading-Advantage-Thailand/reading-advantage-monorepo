import { Tour } from "onborda/dist/types";

export const steps: Tour[] = [
  {
    tour: "desktop",
    steps: [
      {
        icon: <>👋</>,
        title: "Welcome to Reading Advantage!",
        content: (
          <>
            Discover a platform designed to enhance your language and learning
            journey.
          </>
        ),
        selector: "#onborda-step1",
        side: "top",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>☰</>,
        title: "User menu!",
        content: (
          <>
            Access your profile, settings, and key features from the user menu.
          </>
        ),
        selector: "#onborda-usermanu",
        side: "bottom-right",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
        nextRoute: "/student/read",
      },
      // {
      //   icon: <>👤</>,
      //   title: "Select role!",
      //   content: (
      //     <>
      //       Pick your role—admin, teacher, or learner—to unlock tailored
      //       features.
      //     </>
      //   ),
      //   selector: "#onborda-step1",
      //   side: "top",
      //   showControls: true,
      //   pointerPadding: 0,
      //   pointerRadius: 10,
      // },
      // {
      //   icon: <>📝</>,
      //   title: "Level test and reason!",
      //   content: (
      //     <>
      //       Take a quick test to assess your skill level and focus on your
      //       learning goals.
      //     </>
      //   ),
      //   selector: "#onborda-step1",
      //   side: "top",
      //   showControls: true,
      //   pointerPadding: 0,
      //   pointerRadius: 10,
      // },

      {
        icon: <>📚</>,
        title: "Choose reading material!",
        content: (
          <>Select articles and stories based on your interests and level.</>
        ),
        selector: "#onborda-articles",
        side: "bottom",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
        prevRoute: "/",
      },
      {
        icon: <>🌐</>,
        title: "Select your language!",
        content: (
          <>
            Choose your preferred language to personalize your app experience.
          </>
        ),
        selector: "#onborda-language",
        side: "bottom",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>⭐️</>,
        title: "XP total!",
        content: (
          <>
            Track your total experience points and see your learning progress.
          </>
        ),
        selector: "#onborda-xp",
        side: "bottom",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>✏️</>,
        title: "Sentences Page!",
        content: <>Find saved sentences for review and translation practice.</>,
        selector: "#onborda-sentences",
        side: "bottom",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>📖</>,
        title: "Vocabulary Page!",
        content: (
          <>
            Manage your vocabulary list and track your word-learning progress.
          </>
        ),
        selector: "#onborda-vocabulary",
        side: "bottom",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>📊</>,
        title: "Report page!",
        content: (
          <>View detailed reports of your performance and learning trends.</>
        ),
        selector: "#onborda-reports",
        side: "bottom",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>🕒</>,
        title: "History Page!",
        content: <>Check your past activities and revisit completed content.</>,
        selector: "#onborda-history",
        side: "bottom",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
        nextRoute: "/student/read/0FAE8fTzcqt8UXzOv9Cz",
      },
      {
        icon: <>🔄</>,
        title: "Translation!",
        content: <>Instantly translate text to understand content better.</>,
        selector: "#onborda-translate",
        side: "top-right",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
        prevRoute: "/student/read",
      },
      {
        icon: <>🎧</>,
        title: "Audio!",
        content: (
          <>Listen to articles or practice pronunciation with audio support.</>
        ),
        selector: "#onborda-audio",
        side: "top",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>💾</>,
        title: "Save sentences for translation!",
        content: <>Save key sentences to revisit and learn from later.</>,
        selector: "#onborda-savesentences",
        side: "top",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },

      {
        icon: <>👍</>,
        title: "Rate the article!",
        content: (
          <>Share your feedback on reading material to improve suggestions.</>
        ),
        selector: "#onborda-rating",
        side: "top",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>📋</>,
        title: "Word list button!",
        content: (
          <>Access your saved words for review and vocabulary practice.</>
        ),
        selector: "#onborda-wordbutton",
        side: "bottom-right",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>📥</>,
        title: "Save words for practice!",
        content: <>Bookmark tricky words to practice and master them later.</>,
        selector: "#onborda-wordbutton",
        side: "bottom-right",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>✅</>,
        title: "Multiple-choice questions!",
        content: (
          <>Test your knowledge with multiple-choice questions after reading.</>
        ),
        selector: "#onborda-mcq",
        side: "bottom",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>✍️</>,
        title: "Short-answer questions!",
        content: <>Practice short-answer questions to enhance comprehension.</>,
        selector: "#onborda-saq",
        side: "bottom",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>🖊️</>,
        title: "Long-answer questions!",
        content: <>Answer long-form questions to build your writing skills.</>,
        selector: "#onborda-laq",
        side: "bottom",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>💬</>,
        title: "Chatbot!",
        content: (
          <>Engage with the chatbot for personalized assistance and practice.</>
        ),
        selector: "#onborda-chatbot",
        side: "top-right",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
    ],
  },
  {
    tour: "mobile",
    steps: [
      {
        icon: <>👋</>,
        title: "Welcome to Reading Advantage!",
        content: (
          <>
            Discover a platform designed to enhance your language and learning
            journey.
          </>
        ),
        selector: "#onborda-step1",
        side: "top",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>☰</>,
        title: "User menu!",
        content: (
          <>
            Access your profile, settings, and key features from the user menu.
          </>
        ),
        selector: "#onborda-usermanu",
        side: "bottom-right",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
        nextRoute: "/student/read",
      },
      // {
      //   icon: <>👤</>,
      //   title: "Select role!",
      //   content: (
      //     <>
      //       Pick your role—admin, teacher, or learner—to unlock tailored
      //       features.
      //     </>
      //   ),
      //   selector: "#onborda-step1",
      //   side: "top",
      //   showControls: true,
      //   pointerPadding: 0,
      //   pointerRadius: 10,
      // },
      // {
      //   icon: <>📝</>,
      //   title: "Level test and reason!",
      //   content: (
      //     <>
      //       Take a quick test to assess your skill level and focus on your
      //       learning goals.
      //     </>
      //   ),
      //   selector: "#onborda-step1",
      //   side: "top",
      //   showControls: true,
      //   pointerPadding: 0,
      //   pointerRadius: 10,
      // },

      {
        icon: <>📚</>,
        title: "Choose reading material!",
        content: (
          <>Select articles and stories based on your interests and level.</>
        ),
        selector: "#onborda-articles",
        side: "top",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
        prevRoute: "/",
      },
      {
        icon: <>🌐</>,
        title: "Select your language!",
        content: (
          <>
            Choose your preferred language to personalize your app experience.
          </>
        ),
        selector: "#onborda-language",
        side: "bottom",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>⭐️</>,
        title: "XP total!",
        content: (
          <>
            Track your total experience points and see your learning progress.
          </>
        ),
        selector: "#onborda-xp",
        side: "bottom",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>✏️</>,
        title: "Sentences Page!",
        content: <>Find saved sentences for review and translation practice.</>,
        selector: "#onborda-sentences",
        side: "bottom",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>📖</>,
        title: "Vocabulary Page!",
        content: (
          <>
            Manage your vocabulary list and track your word-learning progress.
          </>
        ),
        selector: "#onborda-vocabulary",
        side: "bottom-right",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>📊</>,
        title: "Report page!",
        content: (
          <>View detailed reports of your performance and learning trends.</>
        ),
        selector: "#onborda-reports",
        side: "bottom-left",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>🕒</>,
        title: "History Page!",
        content: <>Check your past activities and revisit completed content.</>,
        selector: "#onborda-history",
        side: "bottom",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
        nextRoute: "/student/read/0FAE8fTzcqt8UXzOv9Cz",
      },
      {
        icon: <>🔄</>,
        title: "Translation!",
        content: <>Instantly translate text to understand content better.</>,
        selector: "#onborda-translate",
        side: "top-right",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
        prevRoute: "/student/read",
      },
      {
        icon: <>🎧</>,
        title: "Audio!",
        content: (
          <>Listen to articles or practice pronunciation with audio support.</>
        ),
        selector: "#onborda-audio",
        side: "top",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>💾</>,
        title: "Save sentences for translation!",
        content: <>Save key sentences to revisit and learn from later.</>,
        selector: "#onborda-savesentences",
        side: "top",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },

      {
        icon: <>👍</>,
        title: "Rate the article!",
        content: (
          <>Share your feedback on reading material to improve suggestions.</>
        ),
        selector: "#onborda-rating",
        side: "top",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>📋</>,
        title: "Word list button!",
        content: (
          <>Access your saved words for review and vocabulary practice.</>
        ),
        selector: "#onborda-wordbutton",
        side: "bottom-right",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>📥</>,
        title: "Save words for practice!",
        content: <>Bookmark tricky words to practice and master them later.</>,
        selector: "#onborda-wordbutton",
        side: "bottom-right",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>✅</>,
        title: "Multiple-choice questions!",
        content: (
          <>Test your knowledge with multiple-choice questions after reading.</>
        ),
        selector: "#onborda-mcq",
        side: "top",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>✍️</>,
        title: "Short-answer questions!",
        content: <>Practice short-answer questions to enhance comprehension.</>,
        selector: "#onborda-saq",
        side: "top",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>🖊️</>,
        title: "Long-answer questions!",
        content: <>Answer long-form questions to build your writing skills.</>,
        selector: "#onborda-laq",
        side: "top",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
      {
        icon: <>💬</>,
        title: "Chatbot!",
        content: (
          <>Engage with the chatbot for personalized assistance and practice.</>
        ),
        selector: "#onborda-chatbot",
        side: "top-right",
        showControls: true,
        pointerPadding: 0,
        pointerRadius: 10,
      },
    ],
  },
];
