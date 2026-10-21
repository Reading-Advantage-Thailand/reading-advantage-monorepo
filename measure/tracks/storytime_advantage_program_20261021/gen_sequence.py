# Generates the 128-row scope and sequence table for the Storytime design document.
RAZ = {1:"n",2:"short a",3:"p",4:"m",5:"s",6:"t",7:"short o",8:"d",9:"-an -ad",10:"short e",11:"h",12:"-ot -op",13:"f",14:"g",15:"-et -en",16:"short i",17:"b",18:"-it -in",19:"c",20:"r",21:"short u",22:"-ug -un",23:"l",24:"w",25:"-at -ap",26:"j",27:"k",28:"-ut -ub",29:"v",30:"y",31:"-ill -ip",32:"qu",33:"x",34:"z",35:"-ob -ell",36:"s-blends",37:"r-blends",38:"l-blends",39:"final n-blends",40:"final blends",41:"3-letter blends",42:"a_e",43:"o_e",44:"i_e",45:"u_e",46:"sh",47:"ch",48:"ck",49:"ng",50:"th",51:"wh",52:"open vowels",53:"ee ea ie",54:"short ea",55:"ai ay",56:"ea eigh ey",57:"oa oe ow",58:"i igh",59:"oo ue ew",60:"oo oul u",61:"a aw",62:"augh ough",63:"oi oy",64:"ou ow",65:"or oar our",66:"air are ear",67:"ar",68:"er ir ur"}
PA32 = ["Word awareness","Syllable counting","Rhyme 1","Rhyme 2","Rhyme 3","Initial sound; alliteration","REVIEW","Initial sound; syllable blending","Syllable deletion; blend onset-rime","Segment onset-rime","Phoneme addition","Phoneme deletion","Rhyme; phoneme substitution","REVIEW","Segment onset-rime; addition","Final sound","Phoneme substitution","REVIEW","Final + initial; phoneme blending","Initial, medial, final; segment and blend","Medial vowel; segmentation","Word awareness; syllables (pass 2)","Rhyme; syllables (pass 2)","Rhyme; alliteration (pass 2)","REVIEW","Blend and segment onset-rime (pass 2)","Alliteration; initial; delete, segment, blend","Final sound (pass 2)","Initial, medial, final; segment, blend (capstone)","REVIEW","REVIEW","REVIEW"]
# Level 1 PA: sightwords A listening in weeks 1-3, then RAZ teaching lessons in order, review weeks at 8,16,24,32
pa_teach = [p for p in PA32 if p!="REVIEW"]  # 25
l1_pa = ["Listening: start-stop, name the sound (DSS A1-A3)","Listening: first, next, last sound (DSS A4-A6)","Listening: sound effects, silly songs, directions (DSS A7-A9)"] + pa_teach  # 28
# Level 1 letter sounds in RAZ letter order (26 single letters), weeks 3-28 of teaching slots; weeks 1-2 none
letters_raz_order = ["n","a","p","m","s","t","o","d","e","h","f","g","i","b","c","r","u","l","w","j","k","v","y","q","x","z"]
starters_topics = ["Names and greetings","Numbers 1-10","Colours","Family","Body and face","Animals (pets)","Toys","Food and drink","Clothes","Home","School","Actions (verbs)","Weather","Transport","Places (park, shop)","Feelings","Sports and play","Time and days","Animals (farm and zoo)","Fruit","The world around us (nature)","Jobs","Health","Music and sounds","Shapes and size","Opposites","Birthday and parties","Holidays"]
viu = {"Feelings":"ViU 7","Food and drink":"ViU 22","Home":"ViU 11/13","School":"ViU 15","Jobs":"ViU 14","Sports and play":"ViU 23","Weather":"ViU 28","Places (park, shop)":"ViU 29","Animals (pets)":"ViU 31","Animals (farm and zoo)":"ViU 31","Transport":"ViU 32/49","Time and days":"ViU 51","Actions (verbs)":"ViU 47/49","Music and sounds":"ViU 26","The world around us (nature)":"ViU 30","Names and greetings":"ViU 52","Opposites":"ViU 56"}
frames = {
1:["Hello! Goodbye!","My name is ___.","It's a ___.","I am ___ (age).","This is my ___.","Point to your ___.","I have a ___.","I like ___.","Stand up. Sit down.","It's ___ (colour).","A ___, please.","I can ___.","It's ___ (weather).","Go, go, go!","Where is ___? Here!","I am happy/sad.","Let's play!","Today is ___.","Big ___. Small ___.","I like ___ (fruit).","Look! A ___.","He/She is a ___.","I'm OK.","Clap! Stamp!","It's a circle.","Up and down.","Happy birthday!","Bye-bye, ___!"],
2:["Hello, I am ___.","How many? One, two...","It is ___ (colour).","This is my ___.","I have two ___.","I can see a ___.","Is it a ___? Yes/No.","I like ___. Yum!","Put on your ___.","Where is ___? In/On/Under.","Open your book.","I can run/hop/jump.","It is hot/cold.","Look, a ___!","Let's go to the ___.","I am ___. Are you ___?","Can you ___? Yes, I can.","What day is it?","The ___ is big/small.","I like ___. Do you?","What is it? It is a ___.","He/She is a ___.","I have a ___ (body part) ache.","I can hear a ___.","It is a ___ (shape).","___ is big. ___ is small.","How old are you? I am ___.","Here is a ___ for you."],
3:["What's your name? I'm ___.", 'How many ___ are there? There are ___.', 'What colour is ___? It is ___.', 'Who is this? This is my ___.', 'I have ___ eyes/hands.', "Do you like ___? Yes, I do./No, I don't.", 'Is this your ___? Yes, it is.', 'What do you want? I want ___.', 'He/She has a ___ (clothes).', 'There is a ___ in the ___.', "What's this? It's a ___.", "He/She can ___. He/She can't ___.", "What's the weather like? It's ___.", 'How do you go to school? By ___.', 'Where is the ___? Next to ___.', "How are you? I'm ___.", "Let's play ___. Good idea!", "What time is it? It's ___ o'clock.", 'The ___ lives on a farm.', "I like ___ but I don't like ___.", "Look at the ___! It's ___.", 'What does he/she do? He/She is a ___.', 'I have a ___. Oh no!', 'I can play the ___.', "It's a big red ___.", '___ is tall. ___ is short.', "Happy birthday! Here's a ___.", 'We go to the ___.'],
4:['This is ___. ___ is a ___ (Origins frame).', 'How many? Numbers to 20.', 'What colour is his/her ___?', "___ is ___'s brother/sister (possessive 's).", '___ has got ___.', '___ likes ___. ___ loves ___.', 'Where is ___? ___ is in the garden.', '___ says, "___!"', 'What is ___ wearing?', 'Is there a ___? Yes, there is.', 'What does Teacher ___ say?', '___ comes too. ___ looks at ___.', "It is sunny. Let's go to the ___.", '___ goes by ___.', 'Who is in the park? ___ and ___.', 'How is ___? ___ is happy/sad/angry.', 'Do you like ___? ___ asks.', 'What day is it today?', 'What does the ___ say? Woof!', '___ is eating a ___.', "Don't ___! Be careful!", 'What does your mom/dad do?', '___ is sick. Poor ___!', 'Listen! I can hear ___.', 'It is big and brown.', '___ is old. ___ is new.', 'Happy birthday, ___! ___ is eight.', 'Goodbye, ___! See you!'],
}
hf = {
2:["a, and, can","I, on, in","the, get","is, this","off, saw, with","cannot, he, put, see","from, run, up","are, has","they, too, were","me, of","goes, it, said, that","do, for, like","this, you","his, no, my","she, will","her, look","eat","stop, them","jump, just","we","go, play, take","over, want","would","out","does","good","have","more, some"],
3:['into, went', 'make, one', 'never, seen', 'as, where', 'help, made', 'be, who, then', 'how, new, there', '(Thai week: review)', 'give, live', 'come, think, why', "could, don't, so", 'by, your', 'every', 'day, our', '(Thai week: review)', '(Thai week: review)', 'always, find', 'about, people', 'what', '(review)', '(review)', '(review)', '(review)', '(review)', '(review)', '(Thai week: review)', '(review)', '(Thai week: review)'],
4:['what, give', 'live, come', 'think, why', "could, don't", 'so, by', 'your, every', 'day, our', 'always, find', 'about, people', '(review)', '(review)', '(review)', '(review)', '(review)', '(review)', '(review)', '(review)', 'says, comes, asks', 'looks, loves, am, are', 'yes, to, do, does', 'or, old, say, how', 'color, white, red, blue, children', 'school, teacher, draw, write, sit', '(fluency: all 92 words timed)', '(fluency: dialogue)', '(writing: frames)', '(writing: frames)', 'Lily, Tom, Mia, Pip (names)'],
}
def level_rows(level, grade, minutes):
    rows=[]; t=0  # teaching index
    for wk in range(1,33):
        review = wk in (8,16,24,32)
        bench = {8:"Benchmark 1 (PA/letter-sound)",16:"Benchmark 2 (mid-year)",24:"Benchmark 3",32:"Benchmark 4 (end-of-level profile)"}.get(wk,"")
        if review:
            rows.append((level,wk,"REVIEW WEEK","Review","(review)","Review of the four frames","Review","Review song medley","Re-read the four books","Re-read + reading records",bench)); continue
        i=t; t+=1
        topic=starters_topics[i]; fam=topic+(" ("+viu[topic]+")" if topic in viu else " (Starters)")
        if level==1:
            el = "Listening only" if i<2 else "Letter "+letters_raz_order[i-2]+" name+sound (song)"
            pa = l1_pa[i]; h="(none; name writing wk 20+)"; raz=""
            frame=frames[1][i]
            song=f"Song: '{frame.split('.')[0]}' / {topic}"; ra=f"Read-along: one word or phrase per page, {topic}"; dec="(none in Level 1)"
        elif level==2:
            n=i+1; el=f"RAZ {n}: {RAZ[n]}"; pa="Daily 2-min: sound of the week (initial/final), blend 3 sounds"; h=hf[2][i]; frame=frames[2][i]
            song=f"Song: '{frame.split('.')[0]}' / {topic}"; ra=f"Read-along: one sentence per page, frame repeats, {topic}"; dec=f"Decodable {n}: {RAZ[n]} words"
        elif level==3:
            seq = list(range(29,36)) + ["T1 final consonants /p t k d/"] + list(range(36,42)) + ["T2 initial clusters","T3 final clusters and -s"] + list(range(42,51)) + ["T4 th s f contrast"] + [51] + ["T5 v w, r l contrast"]
            item=seq[i]
            el = f"RAZ {item}: {RAZ[item]}" if isinstance(item,int) else "Thai-specific: "+item
            pa="Daily 2-min: segment and blend 4 sounds; digraph and blend awareness (DSS I, K)"; h=hf[3][i]; frame=frames[3][i]
            song=f"Song: '{frame.split('?')[0].split('.')[0]}' / {topic}"; ra=f"Read-along: two sentences per page, question and answer, {topic}"
            dec = f"Decodable {item}: {RAZ[item]} words" if isinstance(item,int) else "Decodable: review text for the contrast"
        else:
            seq = list(range(52,69)) + ["E1 -s -es endings","E2 -ing -ed endings","E3 two-syllable and compound words","E4 vowel length contrast (Thai)","E5 long and short vowel review","E6 fluency: timed re-read","E7 fluency: dialogue and expression","E8 sentence writing 1","E9 sentence writing 2","E10 bridge: read an Origins 1 text","E11 bridge: Origins 1 frames and names"]
            item=seq[i]
            el = f"RAZ {item}: {RAZ[item]}" if isinstance(item,int) else "Exit-profile week: "+item
            pa="Daily 2-min: swap first/middle/last sound (DSS L); syllables"; h=hf[4][i]; frame=frames[4][i]
            song=f"Song: '{frame.split('.')[0].split('?')[0]}' / {topic}"; ra=f"Read-along: short story 60-100 words with dialogue, {topic}"
            dec = f"Decodable {item}: {RAZ[item]} words" if isinstance(item,int) else "Decodable: cumulative text (all elements)"
        rows.append((level,wk,el,pa,h,frame,fam,song,ra,dec,bench))
    return rows
hdr="| Level | Week | Phonics element / letters | Phonemic awareness | Tricky and HF words | Sentence frame | Vocabulary family | Song concept | Read-along concept | Decodable concept | Check |"
print(hdr); print("|"+"---|"*11)
for lv,gr in [(1,"Anuban 2"),(2,"Anuban 3"),(3,"P1"),(4,"P2")]:
    for r in level_rows(lv,gr,0):
        print("| "+" | ".join(str(x) for x in r)+" |")
