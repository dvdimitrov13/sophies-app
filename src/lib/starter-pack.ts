import { createCard, DAY_MS } from "./spaced-repetition";
import type { Flashcard } from "./types";

/**
 * A1 starter pack: everyday words, each with a short sentence that uses the
 * word in exactly this form. Topics use the same Bulgarian names as cards
 * generated in the app, so they land in the same topic groups.
 *
 * [english, bulgarian, bulgarian sentence, english sentence]
 */
type Entry = [string, string, string, string];

const PACK: Record<string, Entry[]> = {
  приветствия: [
    ["hello", "здравей", "Здравей, как си?", "Hello, how are you?"],
    ["goodbye", "довиждане", "Довиждане, до утре!", "Goodbye, see you tomorrow!"],
    ["thank you", "благодаря", "Благодаря за помощта.", "Thank you for the help."],
    ["please", "моля", "Едно кафе, моля.", "One coffee, please."],
    ["yes", "да", "Да, разбирам.", "Yes, I understand."],
    ["no", "не", "Не, не искам.", "No, I don't want to."],
    ["good morning", "добро утро", "Добро утро, мамо!", "Good morning, mom!"],
    ["good evening", "добър вечер", "Добър вечер на всички.", "Good evening, everyone."],
    ["sorry", "извинявай", "Извинявай, закъснях.", "Sorry, I am late."],
    ["name", "име", "Моето име е София.", "My name is Sofia."],
  ],
  семейство: [
    ["mother", "майка", "Майка ми е учителка.", "My mother is a teacher."],
    ["father", "баща", "Баща ми работи много.", "My father works a lot."],
    ["brother", "брат", "Имам един брат.", "I have one brother."],
    ["sister", "сестра", "Сестра ми живее в София.", "My sister lives in Sofia."],
    ["son", "син", "Те имат малък син.", "They have a little son."],
    ["daughter", "дъщеря", "Тя има една дъщеря.", "She has one daughter."],
    ["grandmother", "баба", "Баба прави хубава баница.", "Grandma makes good banitsa."],
    ["grandfather", "дядо", "Дядо ми е на осемдесет години.", "My grandfather is eighty years old."],
    ["husband", "съпруг", "Моят съпруг е българин.", "My husband is Bulgarian."],
    ["wife", "съпруга", "Неговата съпруга е лекарка.", "His wife is a doctor."],
    ["family", "семейство", "Имам голямо семейство.", "I have a big family."],
    ["friend", "приятел", "Той е мой добър приятел.", "He is my good friend."],
  ],
  храна: [
    ["bread", "хляб", "Купих хляб и мляко.", "I bought bread and milk."],
    ["water", "вода", "Искам чаша вода.", "I want a glass of water."],
    ["coffee", "кафе", "Пия кафе всяка сутрин.", "I drink coffee every morning."],
    ["tea", "чай", "Искаш ли чай?", "Do you want tea?"],
    ["milk", "мляко", "Детето пие мляко.", "The child drinks milk."],
    ["cheese", "сирене", "Обичам бяло сирене.", "I love white cheese."],
    ["apple", "ябълка", "Това е голяма ябълка.", "This is a big apple."],
    ["egg", "яйце", "Ям едно яйце на закуска.", "I eat one egg for breakfast."],
    ["meat", "месо", "Той не яде месо.", "He doesn't eat meat."],
    ["soup", "супа", "Мама прави супа.", "Mom is making soup."],
    ["wine", "вино", "Да пием червено вино.", "Let's drink red wine."],
    ["breakfast", "закуска", "Ям закуска в осем часа.", "I eat breakfast at eight o'clock."],
    ["tomato", "домат", "В салатата има домат.", "There is a tomato in the salad."],
    ["fish", "риба", "Обичам риба.", "I love fish."],
  ],
  цветове: [
    ["red", "червен", "Имам червен пуловер.", "I have a red sweater."],
    ["green", "зелен", "Това е зелен чай.", "This is green tea."],
    ["white", "бял", "Искам бял хляб.", "I want white bread."],
    ["black", "черен", "Пия черен чай.", "I drink black tea."],
    ["yellow", "жълт", "Нося жълт шал.", "I am wearing a yellow scarf."],
    ["color", "цвят", "Какъв цвят е колата?", "What color is the car?"],
  ],
  числа: [
    ["one", "едно", "Имам само едно куче.", "I have only one dog."],
    ["two", "две", "Искам две кафета.", "I want two coffees."],
    ["three", "три", "Имам три сестри.", "I have three sisters."],
    ["five", "пет", "Работя пет дни седмично.", "I work five days a week."],
    ["ten", "десет", "Автобусът идва след десет минути.", "The bus comes in ten minutes."],
    ["hundred", "сто", "Това струва сто евро.", "This costs one hundred euros."],
  ],
  дом: [
    ["house", "къща", "Живеем в малка къща.", "We live in a small house."],
    ["room", "стая", "Това е моята стая.", "This is my room."],
    ["door", "врата", "Къщата има синя врата.", "The house has a blue door."],
    ["window", "прозорец", "Стаята има един прозорец.", "The room has one window."],
    ["table", "маса", "Купихме нова маса.", "We bought a new table."],
    ["chair", "стол", "Това е удобен стол.", "This is a comfortable chair."],
    ["bed", "легло", "Имам голямо легло.", "I have a big bed."],
    ["kitchen", "кухня", "Имаме малка кухня.", "We have a small kitchen."],
    ["key", "ключ", "Къде е моят ключ?", "Where is my key?"],
  ],
  животни: [
    ["dog", "куче", "Имам малко куче.", "I have a small dog."],
    ["cat", "котка", "Тя има бяла котка.", "She has a white cat."],
    ["bird", "птица", "На дървото има птица.", "There is a bird in the tree."],
    ["horse", "кон", "Дядо има кон.", "Grandpa has a horse."],
  ],
  време: [
    ["sun", "слънце", "Днес има много слънце.", "There is a lot of sun today."],
    ["rain", "дъжд", "Навън вали дъжд.", "It is raining outside."],
    ["snow", "сняг", "През зимата има сняг.", "There is snow in winter."],
    ["hot", "горещо", "Днес е много горещо.", "It is very hot today."],
    ["cold", "студено", "Навън е студено.", "It is cold outside."],
    ["weather", "време", "Хубаво време, нали?", "Nice weather, isn't it?"],
  ],
  "време-часове": [
    ["today", "днес", "Днес съм свободна.", "I am free today."],
    ["tomorrow", "утре", "Ще се видим утре.", "See you tomorrow."],
    ["yesterday", "вчера", "Вчера бях на работа.", "Yesterday I was at work."],
    ["now", "сега", "Сега нямам време.", "I don't have time now."],
    ["day", "ден", "Хубав ден!", "Have a nice day!"],
    ["week", "седмица", "Една седмица има седем дни.", "A week has seven days."],
    ["hour", "час", "Срещата е след един час.", "The meeting is in one hour."],
    ["morning", "сутрин", "Всяка сутрин пия кафе.", "Every morning I drink coffee."],
  ],
  действия: [
    ["eat", "ям", "Аз ям ябълка.", "I am eating an apple."],
    ["drink", "пия", "Не пия алкохол.", "I don't drink alcohol."],
    ["speak", "говоря", "Говоря малко български.", "I speak a little Bulgarian."],
    ["understand", "разбирам", "Не разбирам, моля повтори.", "I don't understand, please repeat."],
    ["want", "искам", "Искам да отида на море.", "I want to go to the sea."],
    ["love", "обичам", "Обичам те.", "I love you."],
    ["live", "живея", "Аз живея тук.", "I live here."],
    ["go", "отивам", "Отивам на работа.", "I am going to work."],
    ["know", "знам", "Не знам къде е.", "I don't know where it is."],
    ["have", "имам", "Имам въпрос.", "I have a question."],
    ["work", "работя", "Работя от вкъщи.", "I work from home."],
    ["sleep", "спя", "Искам да спя.", "I want to sleep."],
    ["read", "чета", "Обичам да чета книги.", "I love to read books."],
    ["learn", "уча", "Уча български език.", "I am learning Bulgarian."],
  ],
  транспорт: [
    ["car", "кола", "Имаме нова кола.", "We have a new car."],
    ["bus", "автобус", "Чакам автобус.", "I am waiting for a bus."],
    ["train", "влак", "Пътуваме с влак.", "We travel by train."],
    ["airport", "летище", "Това летище е голямо.", "This airport is big."],
    ["street", "улица", "Живея на тиха улица.", "I live on a quiet street."],
    ["ticket", "билет", "Един билет, моля.", "One ticket, please."],
  ],
  пазаруване: [
    ["shop", "магазин", "Има магазин наблизо.", "There is a shop nearby."],
    ["money", "пари", "Нямам пари.", "I don't have money."],
    ["price", "цена", "Това е добра цена.", "This is a good price."],
    ["how much", "колко", "Колко струва това?", "How much does this cost?"],
    ["buy", "купувам", "Купувам хляб всеки ден.", "I buy bread every day."],
    ["expensive", "скъпо", "Това е много скъпо.", "This is very expensive."],
    ["cheap", "евтино", "Тук е евтино.", "It is cheap here."],
  ],
  дрехи: [
    ["shirt", "риза", "Той носи бяла риза.", "He is wearing a white shirt."],
    ["shoes", "обувки", "Тези обувки са нови.", "These shoes are new."],
    ["dress", "рокля", "Харесвам тази рокля.", "I like this dress."],
    ["coat", "палто", "Нося дебело палто.", "I am wearing a thick coat."],
  ],
  тяло: [
    ["head", "глава", "Боли ме глава.", "My head hurts."],
    ["hand", "ръка", "Дай ми ръка.", "Give me your hand."],
  ],
  здраве: [
    ["doctor", "лекар", "Трябва ми лекар.", "I need a doctor."],
    ["sick", "болен", "Той е болен днес.", "He is sick today."],
    ["pharmacy", "аптека", "Има ли аптека наблизо?", "Is there a pharmacy nearby?"],
  ],
  емоции: [
    ["happy", "щастлив", "Той е много щастлив.", "He is very happy."],
    ["tired", "уморен", "Той е уморен.", "He is tired."],
    ["fine", "добре", "Добре съм, благодаря.", "I am fine, thank you."],
  ],
  училище: [
    ["book", "книга", "Чета интересна книга.", "I am reading an interesting book."],
    ["teacher", "учител", "Моят учител е строг.", "My teacher is strict."],
    ["word", "дума", "Това е нова дума.", "This is a new word."],
    ["question", "въпрос", "Мога ли да задам въпрос?", "Can I ask a question?"],
  ],
  природа: [
    ["sea", "море", "Лятото отиваме на море.", "In summer we go to the sea."],
    ["mountain", "планина", "Обичам да ходя на планина.", "I love going to the mountains."],
    ["tree", "дърво", "В двора има високо дърво.", "There is a tall tree in the yard."],
  ],
  друго: [
    ["what", "какво", "Какво правиш?", "What are you doing?"],
    ["where", "къде", "Къде е тоалетната?", "Where is the toilet?"],
    ["when", "кога", "Кога започва филмът?", "When does the movie start?"],
    ["why", "защо", "Защо плачеш?", "Why are you crying?"],
    ["who", "кой", "Кой е този човек?", "Who is this person?"],
    ["how", "как", "Как си днес?", "How are you today?"],
    ["big", "голям", "Градът е много голям.", "The city is very big."],
    ["small", "малък", "Апартаментът е малък.", "The apartment is small."],
    ["city", "град", "София е хубав град.", "Sofia is a nice city."],
  ],
};

export const STARTER_PACK_NAME = "A1 starter pack";

export const STARTER_PACK_SIZE = Object.values(PACK).reduce(
  (n, entries) => n + entries.length,
  0
);

/**
 * New cards for every pack word not already in the deck, released
 * `perDay` at a time (like Anki's new-cards-per-day limit) so they don't all
 * fall due at once.
 */
export function buildStarterCards(
  existingWords: Set<string>,
  perDay = 10,
  now = Date.now()
): Flashcard[] {
  const fresh = Object.entries(PACK).flatMap(([topic, entries]) =>
    entries
      .filter(([en]) => !existingWords.has(en))
      .map((entry) => ({ topic, entry }))
  );
  return fresh.map(({ topic, entry: [en, bg, bgSentence, enSentence] }, i) =>
    createCard(en, bg, bgSentence, enSentence, topic, now + Math.floor(i / perDay) * DAY_MS)
  );
}
