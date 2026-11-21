const startScreen = document.getElementById("start-screen");
const quizScreen = document.getElementById("quiz-screen");
const resultsScreen = document.getElementById("results-screen");
const settingsForm = document.getElementById("quiz-settings");
const categorySelect = document.getElementById("category");
const difficultySelect = document.getElementById("difficulty");
const startButton = document.getElementById("start-button");
const loadingMessage = document.getElementById("loading-message");
const errorMessage = document.getElementById("error-message");
const errorText = document.getElementById("error-text");
const retryButton = document.getElementById("retry-button");
const bestScoreDisplay = document.getElementById("best-score");
const questionCount = document.getElementById("question-count");
const questionText = document.getElementById("question-text");
const questionCategory = document.getElementById("question-category");
const answerList = document.getElementById("answer-list");
const answerFeedback = document.getElementById("answer-feedback");
const currentScore = document.getElementById("current-score");
const timerText = document.getElementById("timer-text");
const progressTrack = document.getElementById("progress-track");
const progressFill = document.getElementById("progress-fill");
const nextButton = document.getElementById("next-button");
const resultsMessage = document.getElementById("results-message");
const finalScore = document.getElementById("final-score");
const finalPercentage = document.getElementById("final-percentage");
const newBestMessage = document.getElementById("new-best");
const storageNote = document.getElementById("storage-note");
const playAgainButton = document.getElementById("play-again-button");

const QUESTION_TIME = 15;
const BEST_SCORE_KEY = "quizyBestScore";
const ANSWER_LETTERS = ["A", "B", "C", "D"];

let quiz = null;
let timerId = null;
let secondsLeft = QUESTION_TIME;
let isLoading = false;

class Question {
  constructor(text, correctAnswer, incorrectAnswers, category) {
    this.text = text;
    this.correctAnswer = correctAnswer;
    this.category = category;
    this.answers = [correctAnswer, ...incorrectAnswers];

    for (let index = this.answers.length - 1; index > 0; index--) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [this.answers[index], this.answers[randomIndex]] = [
        this.answers[randomIndex],
        this.answers[index]
      ];
    }
  }
}

class Quiz {
  constructor(questions) {
    this.questions = questions;
    this.currentIndex = 0;
    this.score = 0;
    this.hasAnswered = false;
  }

  getCurrentQuestion() {
    return this.questions[this.currentIndex];
  }

  checkAnswer(answer) {
    if (this.hasAnswered) {
      return null;
    }

    this.hasAnswered = true;
    const isCorrect = answer === this.getCurrentQuestion().correctAnswer;

    if (isCorrect) {
      this.score++;
    }

    return isCorrect;
  }

  nextQuestion() {
    if (!this.hasAnswered) {
      return false;
    }

    this.currentIndex++;
    this.hasAnswered = false;
    return !this.isFinished();
  }

  isFinished() {
    return this.currentIndex >= this.questions.length;
  }
}

function decodeAnswer(text) {
  return decodeURIComponent(text);
}

function showScreen(screenToShow) {
  startScreen.hidden = screenToShow !== startScreen;
  quizScreen.hidden = screenToShow !== quizScreen;
  resultsScreen.hidden = screenToShow !== resultsScreen;
}

function updateBestScoreDisplay() {
  try {
    const bestScore = localStorage.getItem(BEST_SCORE_KEY);
    bestScoreDisplay.textContent = bestScore === null ? "Not set yet" : bestScore + " / 10";
  } catch (error) {
    console.error("Could not read the best score:", error);
    bestScoreDisplay.textContent = "Unavailable";
  }
}

function getApiUrl() {
  const parameters = new URLSearchParams();
  parameters.set("amount", "10");
  parameters.set("type", "multiple");
  parameters.set("encode", "url3986");

  if (categorySelect.value) {
    parameters.set("category", categorySelect.value);
  }

  if (difficultySelect.value) {
    parameters.set("difficulty", difficultySelect.value);
  }

  return "https://opentdb.com/api.php?" + parameters.toString();
}

function getApiError(responseCode) {
  const messages = {
    1: "There aren’t enough questions for that combination. Choose another category or difficulty.",
    2: "Those quiz settings weren’t accepted. Please change them and try again.",
    3: "The trivia service could not start a session. Please try again.",
    4: "The trivia service ran out of questions for that session. Please try again.",
    5: "The trivia service is taking a short break. Wait a few seconds, then try again."
  };

  return messages[responseCode] || "The trivia service sent an unexpected response. Please try again.";
}

async function loadQuestions() {
  if (isLoading) {
    return;
  }

  isLoading = true;
  startButton.disabled = true;
  categorySelect.disabled = true;
  difficultySelect.disabled = true;
  loadingMessage.hidden = false;
  errorMessage.hidden = true;

  try {
    const response = await fetch(getApiUrl());

    if (!response.ok) {
      throw new Error("The trivia service returned an error (" + response.status + "). Please try again.");
    }

    const data = await response.json();

    if (data.response_code !== 0) {
      throw new Error(getApiError(data.response_code));
    }

    const questions = data.results.map(function (item) {
      return new Question(
        decodeAnswer(item.question),
        decodeAnswer(item.correct_answer),
        item.incorrect_answers.map(decodeAnswer),
        decodeAnswer(item.category)
      );
    });

    quiz = new Quiz(questions);
    showScreen(quizScreen);
    displayQuestion();
  } catch (error) {
    console.error("Could not load quiz questions:", error);
    errorText.textContent = error.message || "We couldn’t load your questions. Please try again.";
    errorMessage.hidden = false;
  } finally {
    isLoading = false;
    startButton.disabled = false;
    categorySelect.disabled = false;
    difficultySelect.disabled = false;
    loadingMessage.hidden = true;
  }
}

function displayQuestion() {
  clearInterval(timerId);

  const question = quiz.getCurrentQuestion();
  const questionNumber = quiz.currentIndex + 1;

  questionCount.textContent = "Question " + questionNumber + " of " + quiz.questions.length;
  questionText.textContent = question.text;
  questionCategory.textContent = question.category.toUpperCase();
  currentScore.textContent = quiz.score;
  progressTrack.setAttribute("aria-valuemax", quiz.questions.length);
  progressTrack.setAttribute("aria-valuenow", questionNumber);
  progressFill.style.width = (questionNumber / quiz.questions.length) * 100 + "%";
  answerFeedback.textContent = "";
  answerFeedback.className = "answer-feedback";
  nextButton.hidden = true;
  nextButton.textContent = "Next question";
  answerList.textContent = "";

  question.answers.forEach(function (answer, index) {
    const answerButton = document.createElement("button");
    const answerLetter = document.createElement("span");
    const answerText = document.createElement("span");

    answerButton.className = "answer-button";
    answerButton.type = "button";
    answerButton.dataset.answer = answer;
    answerLetter.className = "answer-letter";
    answerLetter.textContent = ANSWER_LETTERS[index];
    answerText.textContent = answer;

    answerButton.appendChild(answerLetter);
    answerButton.appendChild(answerText);
    answerButton.addEventListener("click", selectAnswer);
    answerList.appendChild(answerButton);
  });

  questionText.focus();
  startTimer();
}

function startTimer() {
  secondsLeft = QUESTION_TIME;
  timerText.textContent = secondsLeft;
  timerId = setInterval(function () {
    secondsLeft--;
    timerText.textContent = secondsLeft;

    if (secondsLeft <= 0) {
      clearInterval(timerId);
      handleTimeUp();
    }
  }, 1000);
}

function disableAnswers() {
  const answerButtons = answerList.querySelectorAll(".answer-button");
  answerButtons.forEach(function (button) {
    button.disabled = true;
  });
  return answerButtons;
}

function revealCorrectAnswer(answerButtons) {
  answerButtons.forEach(function (button) {
    if (button.dataset.answer === quiz.getCurrentQuestion().correctAnswer) {
      button.classList.add("is-correct");
    }
  });
}

function selectAnswer(event) {
  const selectedButton = event.currentTarget;
  const isCorrect = quiz.checkAnswer(selectedButton.dataset.answer);

  if (isCorrect === null) {
    return;
  }

  clearInterval(timerId);
  const answerButtons = disableAnswers();
  revealCorrectAnswer(answerButtons);

  if (isCorrect) {
    answerFeedback.textContent = "Correct.";
    answerFeedback.classList.add("is-correct");
  } else {
    selectedButton.classList.add("is-wrong");
    answerFeedback.textContent = "Incorrect. The correct answer is highlighted.";
    answerFeedback.classList.add("is-wrong");
  }

  currentScore.textContent = quiz.score;
  nextButton.hidden = false;
}

function handleTimeUp() {
  quiz.checkAnswer(null);
  const answerButtons = disableAnswers();
  revealCorrectAnswer(answerButtons);
  answerFeedback.textContent = "Time expired. The correct answer is highlighted.";
  answerFeedback.classList.add("is-wrong");
  nextButton.hidden = false;
}

function goToNextQuestion() {
  clearInterval(timerId);
  const hasMoreQuestions = quiz.nextQuestion();

  if (hasMoreQuestions) {
    displayQuestion();
  } else {
    showResults();
  }
}

function showResults() {
  const percentage = Math.round((quiz.score / quiz.questions.length) * 100);
  let newBest = false;

  finalScore.textContent = quiz.score + "/" + quiz.questions.length;
  finalPercentage.textContent = percentage + "% correct";
  newBestMessage.hidden = true;
  storageNote.hidden = true;

  if (percentage >= 80) {
    resultsMessage.textContent = "Excellent result.";
  } else if (percentage >= 50) {
    resultsMessage.textContent = "Good result.";
  } else {
    resultsMessage.textContent = "Keep practicing.";
  }

  try {
    const savedBest = localStorage.getItem(BEST_SCORE_KEY);
    const bestScore = savedBest === null ? 0 : Number(savedBest);

    if (quiz.score > bestScore) {
      localStorage.setItem(BEST_SCORE_KEY, quiz.score);
      newBest = true;
    }

    updateBestScoreDisplay();
  } catch (error) {
    console.error("Could not save the best score:", error);
    storageNote.textContent = "Your score is here, but this browser couldn’t save your personal best.";
    storageNote.hidden = false;
  }

  newBestMessage.hidden = !newBest;
  showScreen(resultsScreen);
}

function returnToStart() {
  clearInterval(timerId);
  quiz = null;
  showScreen(startScreen);
  updateBestScoreDisplay();
}

settingsForm.addEventListener("submit", function (event) {
  event.preventDefault();
  loadQuestions();
});

retryButton.addEventListener("click", loadQuestions);
nextButton.addEventListener("click", goToNextQuestion);
playAgainButton.addEventListener("click", returnToStart);

updateBestScoreDisplay();
