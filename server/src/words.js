// Banque de mots de Gribouille, rangée par paquets, et modes de jeu préréglés.
// Pour ajouter des mots : complète le paquet voulu. Pour un nouveau paquet :
// ajoute une entrée dans PACKS (id, nom affiché, liste de mots).

const ANIMAUX = [
  'chat', 'chien', 'lapin', 'souris', 'cochon', 'vache', 'mouton', 'cheval', 'poule', 'canard',
  'girafe', 'éléphant', 'lion', 'tigre', 'zèbre', 'singe', 'panda', 'kangourou', 'pingouin', 'hibou',
  'aigle', 'papillon', 'abeille', 'araignée', 'escargot', 'grenouille', 'requin', 'baleine', 'dauphin',
  'pieuvre', 'crabe', 'tortue', 'serpent', 'crocodile', 'chameau', 'dinosaure', 'flamant rose',
  'hérisson', 'paresseux', 'chauve-souris', 'méduse', 'perroquet', 'koala', 'loup', 'renard', 'ours',
  'écureuil', 'castor', 'hippopotame', 'rhinocéros', 'gorille', 'paon', 'cygne', 'autruche', 'phoque',
  'morse', 'homard', 'étoile de mer', 'hippocampe', 'coccinelle', 'fourmi', 'moustique', 'ver de terre',
  'chenille', 'scorpion', 'lama', 'yack', 'bison', 'cerf', 'licorne', 'dragon',
];

const NOURRITURE = [
  'pomme', 'banane', 'fraise', 'cerise', 'ananas', 'pastèque', 'carotte', 'citrouille', 'champignon',
  'croissant', 'baguette', 'pizza', 'hamburger', 'frites', 'glace', 'gâteau', 'bonbon', 'chocolat',
  'café', 'fromage', 'œuf', 'kebab', 'sushi', 'hot-dog', 'popcorn', 'crêpe', 'raclette', 'brocoli',
  'citron', 'raisin', 'poire', 'avocat', 'tomate', 'piment', 'oignon', 'ail', 'maïs', 'patate',
  'spaghetti', 'lasagnes', 'tacos', 'burrito', 'donut', 'cookie', 'macaron', 'tarte', 'sandwich',
  'soupe', 'salade', 'omelette', 'poulet rôti', 'saucisse', 'barbe à papa', 'sucette', 'milkshake',
  'jus d\'orange', 'thé', 'biberon', 'pain au chocolat', 'éclair au chocolat', 'fondue', 'paella',
];

const PERSONNAGES = [
  'pirate', 'vampire', 'sorcière', 'astronaute', 'fantôme', 'robot', 'squelette', 'zombie', 'momie',
  'ninja', 'chevalier', 'princesse', 'roi', 'reine', 'clown', 'magicien', 'pompier', 'docteur',
  'cuisinier', 'sirène', 'fée', 'géant', 'extraterrestre', 'bonhomme de neige', 'père noël',
  'super-héros', 'cow-boy', 'viking', 'samouraï', 'gladiateur', 'détective', 'policier',
  'facteur', 'jardinier', 'boulanger', 'plombier', 'dentiste', 'coiffeur', 'peintre', 'chanteur',
  'danseuse', 'footballeur', 'boxeur', 'surfeur', 'skieur', 'plongeur', 'bébé', 'grand-mère',
];

const LIEUX = [
  'maison', 'château', 'montagne', 'plage', 'île', 'désert', 'volcan', 'forêt', 'cascade', 'grotte',
  'pyramide', 'tour eiffel', 'phare', 'moulin', 'igloo', 'cabane', 'école', 'hôpital', 'cirque',
  'ferme', 'pont', 'soleil', 'lune', 'étoile', 'nuage', 'arc-en-ciel', 'éclair', 'tornade', 'flocon',
  'arbre', 'sapin', 'palmier', 'cactus', 'fleur', 'tournesol', 'rose', 'champ de blé', 'lac',
  'rivière', 'jungle', 'savane', 'banquise', 'aéroport', 'gare', 'stade', 'piscine', 'zoo', 'musée',
  'bibliothèque', 'supermarché', 'cinéma', 'prison', 'église', 'gratte-ciel', 'fête foraine',
];

const TRANSPORTS = [
  'voiture', 'avion', 'bateau', 'vélo', 'moto', 'train', 'métro', 'hélicoptère', 'sous-marin',
  'tracteur', 'camion', 'ambulance', 'trottinette', 'skateboard', 'fusée', 'montgolfière',
  'parachute', 'soucoupe volante', 'satellite', 'bus', 'taxi', 'voilier', 'kayak', 'tank',
  'camion de pompiers', 'voiture de course', 'téléphérique', 'monocycle', 'roller', 'luge',
];

const OBJETS = [
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
];

const CORPS_ACTIONS = [
  'main', 'pied', 'œil', 'nez', 'bouche', 'oreille', 'cœur', 'cerveau', 'dent', 'moustache', 'barbe',
  'squelette', 'muscle', 'empreinte', 'tatouage',
  'dormir', 'courir', 'nager', 'danser', 'pleurer', 'rire', 'sauter', 'éternuer', 'bâiller', 'ronfler',
  'chanter', 'voler', 'pêcher', 'cuisiner', 'peindre', 'lire', 'écrire', 'jongler', 'grimper',
  'tomber', 'glisser', 'applaudir', 'chuchoter', 'se cacher', 'faire du yoga',
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
  'procrastination', 'coup de foudre', 'heure de pointe', 'effet papillon', 'trou de mémoire',
  'fin du monde', 'voyage dans le temps', 'mirage', 'reflet', 'ombre chinoise', 'éclipse',
  'marée haute', 'aurore boréale', 'tremblement de terre', 'avalanche', 'sables mouvants',
  'chaîne alimentaire', 'photosynthèse', 'évolution', 'système solaire', 'big bang', 'gravitation',
  'mettre les pieds dans le plat', 'avoir un poil dans la main', 'tomber dans les pommes',
  'poser un lapin', 'avoir la tête dans les nuages', 'casser les pieds', 'coûter les yeux de la tête',
  'donner sa langue au chat', 'être dans la lune', 'mettre la main à la pâte', 'avoir le cafard',
  'prendre ses jambes à son cou', 'se noyer dans un verre d\'eau', 'il pleut des cordes',
  'chercher une aiguille dans une botte de foin', 'avoir un chat dans la gorge', 'mouton noir',
  'cheval de bataille', 'boule de nerfs', 'pause café', 'entretien d\'embauche', 'déménagement',
  'embouteillage', 'file d\'attente', 'soldes', 'grève', 'manifestation', 'élection', 'tribunal',
  'contrat', 'facture', 'promotion', 'licenciement', 'retraite', 'anniversaire surprise',
  'mariage', 'divorce', 'héritage', 'jumeaux', 'arbre généalogique', 'chasse au trésor',
  'escape game', 'karaoké', 'concert', 'feu d\'artifice', 'défilé', 'rallye', 'marathon',
];

// Humour adulte et situations gênantes. Pas de personnes réelles ni de drames.
const HARDCORE = [
  'gueule de bois', 'vomi', 'pet', 'caca', 'diarrhée', 'crotte de nez', 'aisselles qui puent',
  'slip sale', 'chaussette trouée', 'odeur de pieds', 'rot', 'haleine de chacal', 'string',
  'soutien-gorge', 'préservatif', 'test de grossesse', 'lendemain de soirée', 'cuite', 'shot',
  'beer pong', 'videur', 'boîte de nuit', 'after', 'kebab de 4 h du matin', 'râteau', 'ex toxique',
  'ghosting', 'friendzone', 'crush', 'cocu', 'suçon', 'walk of shame', 'belle-mère', 'huissier',
  'redressement fiscal', 'amende', 'fourrière', 'radar', 'contrôleur', 'fraudeur', 'pipi au lit',
  'chiasse', 'dentier', 'poil de nez', 'verrue', 'selfie raté', 'photo compromettante',
  'enterrement de vie de garçon', 'mariage raté', 'sieste au boulot', 'partiel raté', 'rattrapage',
  'redoublement', 'prof sadique', 'pause clope', 'pigeon qui fait caca', 'chute dans les escaliers',
  'barbecue raté', 'intoxication alimentaire', 'tatouage raté', 'coupe mulet', 'calvitie',
  'perruque', 'botox', 'teuf', 'sms à l\'ex', 'appel masqué', 'arnaque', 'colocataire sale',
  'vaisselle sale', 'frigo vide', 'fin du mois', 'découvert', 'compte en banque vide', 'lundi matin',
  'réveil qui sonne', 'retard au boulot', 'excuse bidon', 'patron furieux', 'réunion inutile',
  'mail en copie à tout le monde', 'dossier perdu', 'chewing-gum sous la table', 'ronfleur',
  'voisin bruyant', 'fête des voisins', 'karaoké raté', 'danse ridicule', 'chute en vélo',
  'gamelle', 'plat brûlé', 'microbe', 'puces', 'poux', 'cafard', 'rat', 'toilettes bouchées',
  'papier toilette', 'fuite d\'eau', 'panne de courant', 'embrouille', 'bagarre de pigeons',
];

const unique = (...lists) => [...new Set(lists.flat())];

export const PACKS = {
  classique: { label: 'Classique', words: unique(ANIMAUX, NOURRITURE, PERSONNAGES, LIEUX, TRANSPORTS, OBJETS, CORPS_ACTIONS) },
  facile: { label: 'Facile', words: unique(FACILE) },
  difficile: { label: 'Difficile', words: unique(DIFFICILE) },
  geek: { label: 'Geek et cyber', words: unique(GEEK) },
  hardcore: { label: 'Hardcore', words: unique(HARDCORE) },
  tout: { label: 'Tout mélangé', words: unique(ANIMAUX, NOURRITURE, PERSONNAGES, LIEUX, TRANSPORTS, OBJETS, CORPS_ACTIONS, FACILE, DIFFICILE, GEEK) },
};

// Modes préréglés : un clic règle les mots, le temps, les manches et les indices.
export const PRESETS = {
  normal: { label: 'Normal', desc: 'Mots classiques, 3 manches de 80 secondes, avec indices.', pack: 'classique', rounds: 3, drawTime: 80, hints: true },
  rapide: { label: 'Rapide', desc: '2 manches de 45 secondes pour une partie éclair.', pack: 'classique', rounds: 2, drawTime: 45, hints: true },
  facile: { label: 'Facile', desc: 'Des mots simples, 100 secondes pour dessiner.', pack: 'facile', rounds: 3, drawTime: 100, hints: true },
  geek: { label: 'Geek', desc: 'Informatique, cyber et jeux vidéo.', pack: 'geek', rounds: 3, drawTime: 80, hints: true },
  expert: { label: 'Expert', desc: 'Expressions et idées abstraites, sans indices.', pack: 'difficile', rounds: 3, drawTime: 100, hints: false },
  hardcore: { label: 'Hardcore', desc: 'Humour adulte et situations gênantes, 60 secondes, sans indices.', pack: 'hardcore', rounds: 3, drawTime: 60, hints: false },
};

export const PACK_LIST = Object.entries(PACKS).map(([id, p]) => ({ id, label: p.label, count: p.words.length }));
export const PRESET_LIST = Object.entries(PRESETS).map(([id, p]) => ({ id, label: p.label, desc: p.desc }));
