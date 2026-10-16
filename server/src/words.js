// Banque de mots de Gribouille, rangée par thèmes, et modes de jeu préréglés.
// Les thèmes se combinent : l'hôte en coche un ou plusieurs dans le salon.
// Pour ajouter des mots : complète le thème voulu. Pour un nouveau thème :
// ajoute une entrée dans PACKS (nom affiché, liste de mots, adult si réservé aux +18).

const ANIMAUX = [
  'chat', 'chien', 'lapin', 'souris', 'cochon', 'vache', 'mouton', 'cheval', 'poule', 'canard',
  'girafe', 'éléphant', 'lion', 'tigre', 'zèbre', 'singe', 'panda', 'kangourou', 'pingouin', 'hibou',
  'aigle', 'papillon', 'abeille', 'araignée', 'escargot', 'grenouille', 'requin', 'baleine', 'dauphin',
  'pieuvre', 'crabe', 'tortue', 'serpent', 'crocodile', 'chameau', 'dinosaure', 'flamant rose',
  'hérisson', 'paresseux', 'chauve-souris', 'méduse', 'perroquet', 'koala', 'loup', 'renard', 'ours',
  'écureuil', 'castor', 'hippopotame', 'rhinocéros', 'gorille', 'paon', 'cygne', 'autruche', 'phoque',
  'morse', 'homard', 'étoile de mer', 'hippocampe', 'coccinelle', 'fourmi', 'moustique', 'ver de terre',
  'chenille', 'scorpion', 'lama', 'yack', 'bison', 'cerf', 'licorne', 'dragon', 'poisson rouge',
  'ours polaire', 'raton laveur', 'taupe', 'hamster', 'cochon d\'inde', 'poussin', 'dindon', 'chèvre',
  'âne', 'mouette', 'pélican', 'toucan', 'colibri', 'caméléon', 'iguane', 'salamandre', 'lézard',
  'orque', 'narval', 'raie', 'poulpe', 'crevette', 'moule', 'huître', 'libellule', 'sauterelle',
];

const ALIMENTS = [
  'pomme', 'banane', 'fraise', 'cerise', 'ananas', 'pastèque', 'carotte', 'citrouille', 'champignon',
  'croissant', 'baguette', 'pizza', 'hamburger', 'frites', 'fromage', 'œuf', 'kebab', 'sushi',
  'hot-dog', 'popcorn', 'raclette', 'brocoli', 'citron', 'raisin', 'poire', 'avocat', 'tomate',
  'piment', 'oignon', 'ail', 'maïs', 'patate', 'spaghetti', 'lasagnes', 'tacos', 'burrito', 'sandwich',
  'soupe', 'salade', 'omelette', 'poulet rôti', 'saucisse', 'jus d\'orange', 'café', 'thé', 'biberon',
  'pain au chocolat', 'fondue', 'paella', 'couscous', 'tajine', 'ramen', 'nems', 'dim sum',
  'croque-monsieur', 'quiche', 'gratin', 'ratatouille', 'cassoulet', 'choucroute', 'steak',
  'brochette', 'barbecue', 'fish and chips', 'moules-frites', 'escargots de bourgogne', 'cuisses de grenouille',
  'camembert', 'baguette de pain', 'beurre', 'yaourt', 'lait', 'céréales', 'tartine', 'petit-déjeuner',
  'noix de coco', 'mangue', 'kiwi', 'myrtille', 'framboise', 'pêche', 'abricot', 'prune', 'figue',
  'concombre', 'courgette', 'aubergine', 'poivron', 'petits pois', 'haricots verts', 'radis', 'navet',
  'olive', 'cornichon', 'ketchup', 'mayonnaise', 'moutarde', 'sel et poivre', 'riz', 'pâtes',
];

const SUCRERIES = [
  'bonbon', 'sucette', 'chamallow', 'guimauve', 'réglisse', 'dragée', 'caramel', 'nougat', 'praline',
  'sucre d\'orge', 'barbe à papa', 'chewing-gum', 'gâteau au chocolat', 'fondant au chocolat',
  'forêt-noire', 'tarte aux fraises', 'tarte au citron', 'éclair au chocolat', 'religieuse',
  'paris-brest', 'mille-feuille', 'macaron', 'cupcake', 'muffin', 'donut', 'brownie', 'cookie',
  'crêpe', 'gaufre', 'churros', 'beignet', 'profiterole', 'île flottante', 'crème brûlée', 'tiramisu',
  'mousse au chocolat', 'glace à la vanille', 'cornet de glace', 'coupe de glace', 'banana split',
  'pain d\'épices', 'bûche de Noël', 'galette des rois', 'œuf de Pâques', 'lapin en chocolat',
  'tablette de chocolat', 'pâte à tartiner', 'chocolat chaud', 'morceau de sucre', 'pot de miel',
  'confiture', 'crème chantilly', 'pièce montée', 'gâteau d\'anniversaire', 'bougies d\'anniversaire',
  'sorbet', 'esquimau', 'milkshake', 'smoothie', 'pomme d\'amour', 'calisson', 'canelé', 'madeleine',
  'financier', 'chouquette', 'tarte tatin', 'clafoutis', 'flan', 'crumble', 'cheesecake', 'panna cotta',
  'crêpe au sucre', 'bonbon acidulé', 'ourson en guimauve', 'dentier en bonbon', 'collier de bonbons',
];

const AMOUR = [
  'cœur', 'bisou', 'câlin', 'rendez-vous', 'bouquet de roses', 'saint-valentin', 'demande en mariage',
  'bague de fiançailles', 'lune de miel', 'coup de foudre', 'cupidon', 'flèche de cupidon',
  'lettre d\'amour', 'chocolats en forme de cœur', 'dîner aux chandelles', 'slow', 'se tenir la main',
  'papillons dans le ventre', 'chagrin d\'amour', 'cœur brisé', 'jalousie', 'crush', 'premier baiser',
  'mariés', 'gâteau de mariage', 'robe de mariée', 'alliance', 'sérénade', 'balcon', 'Roméo et Juliette',
  'couple', 'amoureux', 'pique-nique romantique', 'cadenas d\'amour', 'nounours géant', 'peluche',
  'cœur dessiné dans le sable', 'regard amoureux', 'mariage', 'témoin de mariage', 'lancer de bouquet',
  'voyage de noces', 'rose rouge', 'carte de saint-valentin', 'texto doux', 'appel vidéo', 'surnom mignon',
  'amour à distance', 'rupture', 'réconciliation', 'demande à genoux', 'cœur avec une flèche',
  'initiales gravées sur un arbre', 'coucher de soleil', 'baiser sous le gui', 'âme sœur',
  'amitié', 'meilleur ami', 'câlin de groupe', 'bisou d\'esquimau',
];

// Personnalités connues : figures historiques, artistes, sportifs, chanteurs, scientifiques.
const PERSONNALITES = [
  'Napoléon', 'Jules César', 'Cléopâtre', 'Jeanne d\'Arc', 'Louis XIV', 'Marie-Antoinette',
  'Toutânkhamon', 'Christophe Colomb', 'Neil Armstrong', 'Thomas Pesquet', 'Marie Curie',
  'Albert Einstein', 'Isaac Newton', 'Charles Darwin', 'Léonard de Vinci', 'la Joconde', 'Picasso',
  'Van Gogh', 'Mozart', 'Beethoven', 'Victor Hugo', 'Molière', 'Shakespeare', 'Charlie Chaplin',
  'Marilyn Monroe', 'Elvis Presley', 'Michael Jackson', 'Freddie Mercury', 'Bob Marley',
  'Édith Piaf', 'Johnny Hallyday', 'Céline Dion', 'Stromae', 'Zinédine Zidane', 'Kylian Mbappé',
  'Lionel Messi', 'Cristiano Ronaldo', 'Usain Bolt', 'Teddy Riner', 'Tony Parker', 'Serena Williams',
  'Mohamed Ali', 'Victor Wembanyama', 'Léon Marchand', 'Steve Jobs', 'Nelson Mandela',
  'Gandhi', 'Martin Luther King', 'Robin des Bois', 'le roi Arthur', 'Merlin l\'enchanteur',
  'Sherlock Holmes', 'Dracula', 'Frankenstein', 'Tarzan', 'Zorro', 'Astérix', 'Obélix',
];

const CLASSIQUE = [
  // personnages
  'pirate', 'vampire', 'sorcière', 'astronaute', 'fantôme', 'robot', 'squelette', 'zombie', 'momie',
  'ninja', 'chevalier', 'princesse', 'roi', 'reine', 'clown', 'magicien', 'pompier', 'docteur',
  'cuisinier', 'sirène', 'fée', 'géant', 'extraterrestre', 'bonhomme de neige', 'père noël',
  'super-héros', 'cow-boy', 'viking', 'samouraï', 'gladiateur', 'détective', 'policier',
  'facteur', 'jardinier', 'boulanger', 'plombier', 'dentiste', 'coiffeur', 'peintre', 'chanteur',
  'danseuse', 'footballeur', 'boxeur', 'surfeur', 'skieur', 'plongeur', 'bébé', 'grand-mère',
  // lieux et nature
  'maison', 'château', 'montagne', 'plage', 'île', 'désert', 'volcan', 'forêt', 'cascade', 'grotte',
  'pyramide', 'tour eiffel', 'phare', 'moulin', 'igloo', 'cabane', 'école', 'hôpital', 'cirque',
  'ferme', 'pont', 'soleil', 'lune', 'étoile', 'nuage', 'arc-en-ciel', 'éclair', 'tornade', 'flocon',
  'arbre', 'sapin', 'palmier', 'cactus', 'fleur', 'tournesol', 'rose', 'champ de blé', 'lac',
  'rivière', 'jungle', 'savane', 'banquise', 'aéroport', 'gare', 'stade', 'piscine', 'zoo', 'musée',
  'bibliothèque', 'supermarché', 'cinéma', 'prison', 'église', 'gratte-ciel', 'fête foraine',
  // transports
  'voiture', 'avion', 'bateau', 'vélo', 'moto', 'train', 'métro', 'hélicoptère', 'sous-marin',
  'tracteur', 'camion', 'ambulance', 'trottinette', 'skateboard', 'fusée', 'montgolfière',
  'parachute', 'soucoupe volante', 'satellite', 'bus', 'taxi', 'voilier', 'kayak', 'tank',
  'camion de pompiers', 'voiture de course', 'téléphérique', 'monocycle', 'roller', 'luge',
  // objets
  'guitare', 'piano', 'batterie', 'téléphone', 'lunettes', 'chapeau', 'parapluie', 'ballon',
  'raquette', 'tente', 'feu de camp', 'cadeau', 'bougie', 'lampe', 'horloge', 'réveil', 'clé',
  'cadenas', 'porte', 'fenêtre', 'escalier', 'lit', 'canapé', 'chaise', 'baignoire', 'toilettes',
  'brosse à dents', 'miroir', 'ciseaux', 'crayon', 'livre', 'cartable', 'loupe', 'microscope',
  'télescope', 'aimant', 'ampoule', 'appareil photo', 'télévision', 'micro', 'casque', 'manette',
  'épée', 'bouclier', 'couronne', 'trésor', 'boussole', 'ancre', 'carte au trésor', 'dé', 'puzzle',
  'cerf-volant', 'yoyo', 'toupie', 'masque', 'balançoire', 'toboggan', 'trampoline', 'ascenseur',
  'chaussette', 'chaussure', 'cravate', 'écharpe', 'gant', 'casquette', 'bottes', 'valise',
  'sac à dos', 'marteau', 'tournevis', 'scie', 'échelle', 'arrosoir', 'pelle', 'balai', 'aspirateur',
  'frigo', 'micro-ondes', 'grille-pain', 'casserole', 'fourchette', 'cuillère', 'couteau', 'verre',
  'bouteille', 'boîte aux lettres', 'enveloppe', 'timbre', 'trophée', 'médaille', 'sifflet',
  'boule de bowling', 'haltère', 'violon', 'trompette', 'harpe', 'accordéon', 'tambour',
  // corps et actions
  'main', 'pied', 'œil', 'nez', 'bouche', 'oreille', 'cerveau', 'dent', 'moustache', 'barbe',
  'muscle', 'empreinte', 'tatouage', 'dormir', 'courir', 'nager', 'danser', 'pleurer', 'rire',
  'sauter', 'éternuer', 'bâiller', 'ronfler', 'chanter', 'voler', 'pêcher', 'cuisiner', 'peindre',
  'lire', 'écrire', 'jongler', 'grimper', 'tomber', 'glisser', 'applaudir', 'chuchoter', 'se cacher',
  'faire du yoga',
];

const GEEK = [
  'ordinateur', 'clavier', 'souris d\'ordinateur', 'écran', 'serveur', 'câble', 'wifi', 'virus',
  'hacker', 'mot de passe', 'pare-feu', 'bug', 'cookie', 'cloud', 'clé usb', 'imprimante', 'emoji',
  'trou noir', 'comète', 'planète', 'routeur', 'antenne', 'satellite', 'disque dur', 'processeur',
  'carte mère', 'batterie externe', 'chargeur', 'casque vr', 'manette', 'console', 'joystick',
  'pixel', 'curseur', 'dossier', 'corbeille', 'mise à jour', 'écran bleu', 'redémarrage',
  'téléchargement', 'connexion perdue', 'captcha', 'phishing', 'cheval de troie', 'rançongiciel',
  'cadenas numérique', 'empreinte digitale', 'reconnaissance faciale', 'code QR', 'code-barres',
  'réseau', 'câble rj45', 'switch', 'data center', 'robot aspirateur', 'drone', 'imprimante 3d',
  'intelligence artificielle', 'algorithme', 'base de données', 'terminal', 'ligne de commande',
  'conteneur', 'baleine docker', 'nuage de données', 'pirate informatique', 'cryptomonnaie',
  'minage', 'boss final', 'point de vie', 'game over', 'sauvegarde', 'niveau suivant', 'speedrun',
  'lag', 'streamer', 'webcam', 'micro gamer', 'clavier mécanique', 'tapis de souris', 'fond d\'écran',
  'notification', 'batterie à 1 %', 'mode avion', 'selfie', 'like', 'hashtag', 'mème',
];

const FACILE = [
  'chat', 'chien', 'poisson', 'oiseau', 'serpent', 'escargot', 'soleil', 'lune', 'étoile', 'nuage',
  'pluie', 'arbre', 'fleur', 'maison', 'voiture', 'vélo', 'bateau', 'avion', 'train', 'ballon',
  'pomme', 'banane', 'glace', 'gâteau', 'pizza', 'œuf', 'carotte', 'citron', 'cerise', 'fraise',
  'chapeau', 'lunettes', 'chaussure', 'clé', 'porte', 'fenêtre', 'lit', 'chaise', 'table', 'livre',
  'crayon', 'ciseaux', 'parapluie', 'bougie', 'cadeau', 'cœur', 'main', 'œil', 'nez', 'bouche',
  'sourire', 'montagne', 'vague', 'île', 'feu', 'arc-en-ciel', 'flocon', 'bonhomme de neige',
  'sapin', 'champignon', 'papillon', 'abeille', 'araignée', 'tortue', 'lapin', 'souris', 'cochon',
  'vache', 'canard', 'pingouin', 'baleine', 'requin', 'fusée', 'robot', 'fantôme', 'couronne',
  'épée', 'drapeau', 'horloge', 'téléphone', 'télévision', 'guitare', 'tambour', 'cerf-volant',
];

const DIFFICILE = [
  'nostalgie', 'jalousie', 'liberté', 'gravité', 'écho', 'vertige', 'insomnie', 'déjà-vu',
  'procrastination', 'heure de pointe', 'effet papillon', 'trou de mémoire', 'fin du monde',
  'voyage dans le temps', 'mirage', 'reflet', 'ombre chinoise', 'éclipse', 'marée haute',
  'aurore boréale', 'tremblement de terre', 'avalanche', 'sables mouvants', 'chaîne alimentaire',
  'photosynthèse', 'évolution', 'système solaire', 'big bang', 'gravitation',
  'mettre les pieds dans le plat', 'avoir un poil dans la main', 'tomber dans les pommes',
  'poser un lapin', 'avoir la tête dans les nuages', 'casser les pieds', 'coûter les yeux de la tête',
  'donner sa langue au chat', 'être dans la lune', 'mettre la main à la pâte', 'avoir le cafard',
  'prendre ses jambes à son cou', 'se noyer dans un verre d\'eau', 'il pleut des cordes',
  'chercher une aiguille dans une botte de foin', 'avoir un chat dans la gorge', 'mouton noir',
  'cheval de bataille', 'boule de nerfs', 'pause café', 'entretien d\'embauche', 'déménagement',
  'embouteillage', 'file d\'attente', 'soldes', 'grève', 'manifestation', 'élection', 'tribunal',
  'contrat', 'facture', 'promotion', 'licenciement', 'retraite', 'anniversaire surprise',
  'divorce', 'héritage', 'jumeaux', 'arbre généalogique', 'chasse au trésor', 'escape game',
  'karaoké', 'concert', 'feu d\'artifice', 'défilé', 'rallye', 'marathon',
];

// Humour adulte et situations gênantes. Pas de personnes réelles ni de drames.
const HARDCORE = [
  'gueule de bois', 'vomi', 'pet', 'caca', 'diarrhée', 'crotte de nez', 'aisselles qui puent',
  'slip sale', 'chaussette trouée', 'odeur de pieds', 'rot', 'haleine de chacal', 'string',
  'soutien-gorge', 'préservatif', 'test de grossesse', 'lendemain de soirée', 'cuite', 'shot',
  'beer pong', 'videur', 'boîte de nuit', 'after', 'kebab de 4 h du matin', 'râteau', 'ex toxique',
  'ghosting', 'friendzone', 'cocu', 'suçon', 'walk of shame', 'belle-mère', 'huissier',
  'redressement fiscal', 'amende', 'fourrière', 'radar', 'contrôleur', 'fraudeur', 'pipi au lit',
  'chiasse', 'dentier', 'poil de nez', 'verrue', 'selfie raté', 'photo compromettante',
  'enterrement de vie de garçon', 'mariage raté', 'sieste au boulot', 'partiel raté', 'rattrapage',
  'redoublement', 'prof sadique', 'pause clope', 'pigeon qui fait caca', 'chute dans les escaliers',
  'barbecue raté', 'intoxication alimentaire', 'tatouage raté', 'coupe mulet', 'calvitie',
  'perruque', 'botox', 'teuf', 'sms à l\'ex', 'appel masqué', 'arnaque', 'colocataire sale',
  'vaisselle sale', 'frigo vide', 'fin du mois', 'découvert', 'compte en banque vide', 'lundi matin',
  'réveil qui sonne', 'retard au boulot', 'excuse bidon', 'patron furieux', 'réunion inutile',
  'mail en copie à tout le monde', 'dossier perdu', 'chewing-gum sous la table', 'ronfleur',
  'voisin bruyant', 'karaoké raté', 'danse ridicule', 'chute en vélo', 'gamelle', 'plat brûlé',
  'puces', 'poux', 'cafard', 'rat', 'toilettes bouchées', 'papier toilette', 'fuite d\'eau',
  'panne de courant', 'embrouille', 'bagarre de pigeons',
];

// Gros mots et insultes de tous les jours. Pas d'insultes visant un groupe de personnes.
const GROS_MOTS = [
  'merde', 'putain', 'bordel', 'zut', 'mince', 'crotte', 'con', 'connard', 'abruti', 'crétin',
  'imbécile', 'idiot', 'débile', 'enfoiré', 'boloss', 'cassos', 'relou', 'tocard', 'blaireau',
  'andouille', 'bouffon', 'nul à chier', 'ta mère', 'doigt d\'honneur', 'bras d\'honneur',
  'va te faire cuire un œuf', 'ferme ta gueule', 'casse-toi', 'dégage', 'fous le camp',
  'tête de nœud', 'tête à claques', 'face de rat', 'sale gosse', 'pauvre type', 'gros naze',
  'raclure', 'ordure', 'vermine', 'pourriture', 'lèche-bottes', 'fayot', 'balance', 'mytho',
  'radin', 'rapiat', 'pique-assiette', 'pochtron', 'gros dégueulasse', 'péteux', 'chieur',
  'emmerdeur', 'casse-couilles', 'trou du cul', 'fesses', 'cul', 'pisser', 'chier', 'roter',
  'cracher', 'bourré comme un coing', 'péter un câble', 'se faire virer', 'prendre une tarte',
  'mettre une claque', 'coup de boule', 'engueulade', 'gros mot', 'bip de censure',
];

const unique = (...lists) => [...new Set(lists.flat())];

export const PACKS = {
  classique: { label: 'Classique', words: unique(CLASSIQUE) },
  animaux: { label: 'Animaux', words: unique(ANIMAUX) },
  aliments: { label: 'Aliments', words: unique(ALIMENTS) },
  sucreries: { label: 'Sucreries et desserts', words: unique(SUCRERIES) },
  amour: { label: 'Amour', words: unique(AMOUR) },
  personnalites: { label: 'Personnalités connues', words: unique(PERSONNALITES) },
  geek: { label: 'Geek et cyber', words: unique(GEEK) },
  facile: { label: 'Facile', words: unique(FACILE) },
  difficile: { label: 'Expressions et idées', words: unique(DIFFICILE) },
  hardcore: { label: 'Hardcore', words: unique(HARDCORE), adult: true },
  grosmots: { label: 'Gros mots', words: unique(GROS_MOTS), adult: true },
};

export const DEFAULT_PACKS = ['classique', 'animaux', 'aliments'];

// Modes préréglés : un clic règle les thèmes, le temps, les manches et les indices.
export const PRESETS = {
  normal: { label: 'Normal', desc: 'Classique, animaux et aliments, 3 manches de 80 secondes, avec indices.', packs: DEFAULT_PACKS, rounds: 3, drawTime: 80, hints: true },
  rapide: { label: 'Rapide', desc: 'Les mêmes thèmes en 2 manches de 45 secondes.', packs: DEFAULT_PACKS, rounds: 2, drawTime: 45, hints: true },
  facile: { label: 'Facile', desc: 'Des mots simples, 100 secondes pour dessiner.', packs: ['facile'], rounds: 3, drawTime: 100, hints: true },
  gourmand: { label: 'Gourmand', desc: 'Aliments, sucreries et desserts.', packs: ['aliments', 'sucreries'], rounds: 3, drawTime: 80, hints: true },
  love: { label: 'Love', desc: 'Amour, couples et Saint-Valentin.', packs: ['amour'], rounds: 3, drawTime: 80, hints: true },
  stars: { label: 'Stars', desc: 'Personnalités connues, sans indices.', packs: ['personnalites'], rounds: 3, drawTime: 90, hints: false },
  geek: { label: 'Geek', desc: 'Informatique, cyber et jeux vidéo.', packs: ['geek'], rounds: 3, drawTime: 80, hints: true },
  expert: { label: 'Expert', desc: 'Expressions et idées abstraites, sans indices.', packs: ['difficile'], rounds: 3, drawTime: 100, hints: false },
  soiree: { label: 'Soirée', desc: 'Tout le jeu sauf les thèmes +18 : un peu de tout.', packs: ['classique', 'animaux', 'aliments', 'sucreries', 'amour', 'personnalites', 'geek', 'difficile'], rounds: 3, drawTime: 80, hints: true },
  hardcore: { label: 'Hardcore (+18)', desc: 'Situations gênantes et gros mots, 60 secondes, sans indices.', packs: ['hardcore', 'grosmots'], rounds: 3, drawTime: 60, hints: false },
};

// ---------- difficulté des mots ----------
// 1 facile, 2 moyen, 3 difficile. Plus le mot est dur, plus il rapporte.
export const LEVELS = {
  1: { label: 'Facile', mult: 1 },
  2: { label: 'Moyen', mult: 1.5 },
  3: { label: 'Difficile', mult: 2 },
};

// Niveau de départ de chaque thème : un animal se dessine plus vite qu'une expression.
const PACK_LEVEL = {
  facile: 1, animaux: 1, aliments: 1, sucreries: 1,
  classique: 2, amour: 2, geek: 2, hardcore: 2, grosmots: 2,
  personnalites: 3, difficile: 3,
};

// Un mot présent dans plusieurs thèmes garde le niveau le plus facile.
const BASE_LEVEL = new Map();
for (const [id, pack] of Object.entries(PACKS)) {
  for (const w of pack.words) BASE_LEVEL.set(w, Math.min(BASE_LEVEL.get(w) ?? 3, PACK_LEVEL[id] ?? 2));
}

// Le niveau part du thème puis s'ajuste à la forme du mot :
// un mot court est plus simple, une expression de 3 mots ou plus est plus dure.
export function wordLevel(word) {
  const w = String(word ?? '');
  const parts = w.split(/[\s'’-]+/).filter(Boolean).length;
  const letters = [...w].filter((ch) => /[\p{L}\p{N}]/u.test(ch)).length;
  let lvl = BASE_LEVEL.get(w) ?? 2;
  if (parts >= 3) lvl += 1;
  else if (parts === 1 && letters <= 5) lvl -= 1;
  if (letters >= 13) lvl += 1;
  return Math.min(3, Math.max(1, lvl));
}

export const PACK_LIST = Object.entries(PACKS).map(([id, p]) => ({ id, label: p.label, count: p.words.length, adult: Boolean(p.adult) }));
export const PRESET_LIST = Object.entries(PRESETS).map(([id, p]) => ({ id, label: p.label, desc: p.desc }));

// Garde uniquement des thèmes qui existent, sans doublon ; jamais vide.
export function cleanPacks(list) {
  const ids = [...new Set((Array.isArray(list) ? list : [list]).filter((id) => typeof id === 'string' && Object.hasOwn(PACKS, id)))];
  return ids.length ? ids : [...DEFAULT_PACKS];
}
