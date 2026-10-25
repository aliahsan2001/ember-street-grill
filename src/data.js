/* Ember Street Grill — site data.
   Everything a real client would edit (menu, prices, deals, contact) lives here. */


  // Photo helper: id -> self-hosted WebP (640 or 1280 wide). Photos from Unsplash.
  const img = (id, w = 800) => `/img/p/${id}-${w > 700 ? 1280 : 640}.webp`;

  const CONFIG = {
    name: 'Ember Street Grill',
    // Leave empty for the concept: wa.me then lets the visitor pick a chat,
    // so the formatted order can still be seen. For a real client, set e.g. '923001234567'.
    whatsappNumber: '',
    phoneDisplay: '+92 21 3500 0000',
    phoneHref: 'tel:+922135000000',
    email: 'hello@emberstreetgrill.example',
    address: 'Shop 4, Food Street, Boat Basin, Block 5, Clifton, Karachi',
    mapQuery: 'Boat Basin, Clifton, Karachi',
    deliveryFee: 150,
    freeDeliveryOver: 3000,
    minDeliveryOrder: 800,
    // 0 = Sunday. Times are 24h in Asia/Karachi; a close past midnight runs into the next day.
    hours: [
      { day: 'Sunday', open: '13:00', close: '02:00' },
      { day: 'Monday', open: '17:00', close: '02:00' },
      { day: 'Tuesday', open: '17:00', close: '02:00' },
      { day: 'Wednesday', open: '17:00', close: '02:00' },
      { day: 'Thursday', open: '17:00', close: '02:00' },
      { day: 'Friday', open: '14:30', close: '02:30' },
      { day: 'Saturday', open: '13:00', close: '02:30' },
    ],
  };

  const CATEGORIES = [
    { id: 'all', label: 'All' },
    { id: 'bbq', label: 'BBQ' },
    { id: 'karahi', label: 'Karahi' },
    { id: 'rolls', label: 'Rolls' },
    { id: 'sides', label: 'Sides & Sweets' },
    { id: 'drinks', label: 'Drinks' },
  ];

  const MENU = [
    // BBQ
    { id: 'seekh', cat: 'bbq', name: 'Beef Seekh Kebab', desc: 'Hand-minced beef, green chilli and fresh coriander, packed on the skewer and charred over coal. 4 pieces.', price: 1150, img: '1708782341231-426344114ace', tags: ['bestseller'] },
    { id: 'tikka', cat: 'bbq', name: 'Chicken Tikka', desc: 'Quarter chicken in a 24-hour yoghurt and red chilli marinade, turned slowly until the edges blacken.', sizes: [{ label: 'Leg', price: 650 }, { label: 'Breast', price: 690 }], img: '1652545296821-09a023a9fd08', tags: ['bestseller', 'spicy'] },
    { id: 'malai', cat: 'bbq', name: 'Malai Boti', desc: 'Boneless chicken in cream, cheese and green cardamom. Soft, smoky and mild. 10 pieces.', price: 1250, img: '1594266063697-304befca9629', tags: [] },
    { id: 'bihari', cat: 'bbq', name: 'Beef Bihari Boti', desc: 'Thin-sliced beef, papaya-tenderised and finished with smoked mustard oil and onions.', price: 1350, img: '1632158929962-a929c9e87570', tags: ['spicy'] },
    { id: 'hariyali', cat: 'bbq', name: 'Hariyali Tikka', desc: 'Boneless chicken in mint, coriander and green chilli. Bright, herby and properly hot.', price: 1150, img: '1727280376746-b89107a5b0df', tags: ['spicy'] },
    { id: 'wings', cat: 'bbq', name: 'Fire Wings', desc: 'Eight wings in our house chilli rub, flame-grilled and tossed in lemon and chaat masala.', price: 890, img: '1765360024331-25b63e85272e', tags: ['spicy'] },
    { id: 'mixed', cat: 'bbq', name: 'Ember Mixed Grill', desc: 'Seekh, chicken tikka, malai boti and bihari boti on one sizzling board. Serves 2.', price: 2950, img: '1555939594-58d7cb561ad1', tags: ['bestseller'] },
    { id: 'chapli', cat: 'bbq', name: 'Peshawari Chapli Kebab', desc: 'Two flat beef kebabs with tomato, pomegranate seed and crushed coriander.', price: 990, img: '1554306297-0c86e837d24b', tags: [] },

    // Karahi
    { id: 'ck-karahi', cat: 'karahi', name: 'Chicken Karahi', desc: 'Tomato, ginger and green chilli cooked down on high flame in the iron karahi. Our signature.', sizes: [{ label: 'Half', price: 1850 }, { label: 'Full', price: 3400 }], img: '1708782340793-ec5f2159a689', tags: ['bestseller'] },
    { id: 'makhni', cat: 'karahi', name: 'Makhni Karahi', desc: 'Chicken in butter, cream and smoked tomato, finished with kasuri methi. Rich and mild.', sizes: [{ label: 'Half', price: 1990 }, { label: 'Full', price: 3650 }], img: '1772730064970-a7b2735c93b9', tags: [] },
    { id: 'mutton-karahi', cat: 'karahi', name: 'Mutton Karahi', desc: 'Bone-in mutton, slow-cooked then fired with tomato, black pepper and julienned ginger.', sizes: [{ label: 'Half', price: 3200 }, { label: 'Full', price: 6200 }], img: '1545247181-516773cae754', tags: ['spicy'] },
    { id: 'namak-mandi', cat: 'karahi', name: 'Namak Mandi Mutton', desc: 'Peshawar-style: mutton, salt, black pepper and fat. Nothing to hide behind, nothing needed.', sizes: [{ label: 'Half', price: 3400 }, { label: 'Full', price: 6500 }], img: '1736239092878-95523f1b1d25', tags: [] },
    { id: 'achari', cat: 'karahi', name: 'Achari Mutton', desc: 'Mutton with mustard seed, fennel, nigella and pickling spices. Tangy and bold.', sizes: [{ label: 'Half', price: 3300 }, { label: 'Full', price: 6300 }], img: '1736239092866-269c7590b1e6', tags: ['spicy'] },
    { id: 'handi', cat: 'karahi', name: 'Chicken Handi', desc: 'Boneless chicken in a creamy, onion-rich gravy, slow-cooked in a clay handi.', sizes: [{ label: 'Half', price: 1750 }, { label: 'Full', price: 3250 }], img: '1694579740719-0e601c5d2437', tags: [] },

    // Rolls
    { id: 'tikka-roll', cat: 'rolls', name: 'Chicken Paratha Roll', desc: 'Tikka boti, garlic mayo, mint chutney and onions rolled in a flaky lachha paratha.', price: 450, img: '1626242108323-cc46c98acdea', tags: ['bestseller'] },
    { id: 'seekh-roll', cat: 'rolls', name: 'Seekh Kebab Roll', desc: 'A whole seekh kebab, imli chutney and pickled onion, wrapped hot off the coal.', price: 520, img: '1719282431723-9d0f4370d4bc', tags: [] },
    { id: 'malai-roll', cat: 'rolls', name: 'Malai Boti Roll', desc: 'Creamy malai boti, cabbage, cheese sauce and a little green chilli.', price: 550, img: '1662116765994-1e4200c43589', tags: [] },
    { id: 'shawarma', cat: 'rolls', name: 'Coal Shawarma', desc: 'Charcoal-roasted chicken, garlic toum, pickles and fries in toasted pita.', price: 490, img: '1719282431565-3b30bb7d2658', tags: [] },

    // Sides & sweets
    { id: 'naan', cat: 'sides', name: 'Tandoori Naan', desc: 'Straight from the tandoor, brushed with butter.', price: 80, img: '1640625314547-aee9a7696589', tags: [] },
    { id: 'garlic-naan', cat: 'sides', name: 'Garlic Naan', desc: 'Roasted garlic, coriander and butter.', price: 150, img: '1697155406014-04dc649b0953', tags: [] },
    { id: 'paratha', cat: 'sides', name: 'Lachha Paratha', desc: 'Layered, crisp-edged and buttery.', price: 120, img: '1708783741187-ff1d081d87da', tags: [] },
    { id: 'fries', cat: 'sides', name: 'Masala Fries', desc: 'Thick-cut fries shaken with our chaat masala.', price: 390, img: '1630384060421-cb20d0e0649d', tags: [] },
    { id: 'gulab-jamun', cat: 'sides', name: 'Gulab Jamun', desc: 'Two warm jamun in cardamom syrup.', price: 250, img: '1593701461250-d7b22dfd3a77', tags: [] },

    // Drinks
    { id: 'mint-margarita', cat: 'drinks', name: 'Mint Margarita', desc: 'Blended mint, lime and crushed ice.', price: 390, img: '1659046842567-2787b5c9c2fe', tags: ['bestseller'] },
    { id: 'lassi', cat: 'drinks', name: 'Mango Lassi', desc: 'Sindhri mango and thick yoghurt.', price: 420, img: '1623065422902-30a2d299bbe4', tags: [] },
    { id: 'lime', cat: 'drinks', name: 'Fresh Lime', desc: 'Sweet, salted or half-half.', price: 250, img: '1653542772393-71ffa417b1c4', tags: [] },
    { id: 'chai', cat: 'drinks', name: 'Doodh Patti Chai', desc: 'Strong, milky and cooked low for a long time.', price: 180, img: '1761483281417-778013dc0177', tags: [] },
    { id: 'soft-drink', cat: 'drinks', name: 'Soft Drink', desc: 'Chilled cola, lemon-lime or orange.', sizes: [{ label: '345 ml', price: 150 }, { label: '1.5 L', price: 320 }], img: '1711154319718-24e9aaac4497', tags: [] },
  ];

  const PLATTERS = [
    { id: 'family-feast', name: 'Family Feast', serves: 'Serves 4–5', price: 7450, was: 9250, img: '1547573854-74d2a71d0826', tag: 'Most ordered',
      items: ['Full Chicken Karahi', '8 Beef Seekh Kebabs', '4 Chicken Tikka (leg)', '6 Tandoori Naan', 'Raita and salad', '1.5 L soft drink'] },
    { id: 'grill-tower', name: 'Ember Grill Tower', serves: 'Serves 6–8', price: 9950, was: 12400, img: '1632158930341-46604b637a0f', tag: 'For the crowd',
      items: ['2 Ember Mixed Grills', '10 Malai Boti', '8 Fire Wings', '10 Tandoori Naan', '2 Raita', '2 × 1.5 L soft drinks'] },
    { id: 'karahi-night', name: 'Karahi Night', serves: 'Serves 4', price: 7200, was: 8250, img: '1545247181-516773cae754', tag: 'Weekend favourite',
      items: ['Full Mutton Karahi', '6 Tandoori Naan', '2 Lachha Paratha', 'Raita and salad', '4 Doodh Patti Chai'] },
    { id: 'date-duo', name: 'Date Night Duo', serves: 'Serves 2', price: 3690, was: 4420, img: '1772730064970-a7b2735c93b9', tag: 'For two',
      items: ['Half Makhni Karahi', '6 Malai Boti', '2 Garlic Naan', '2 Mint Margaritas'] },
    { id: 'roll-party', name: 'Roll Party Box', serves: 'Serves 5–6', price: 4990, was: 5980, img: '1626242108323-cc46c98acdea', tag: 'Game night',
      items: ['10 assorted rolls (chicken, seekh, malai)', '2 Masala Fries', '1.5 L soft drink'] },
    { id: 'solo-box', name: 'Solo Ember Box', serves: 'Serves 1', price: 1450, was: 1830, img: '1603360946369-dc9bb6258143', tag: 'Lunch pick',
      items: ['Chicken Tikka (leg)', '2 Beef Seekh Kebabs', 'Tandoori Naan', 'Masala Fries', '345 ml soft drink'] },
  ];

  // One special per weekday (0 = Sunday)
  const DAILY = [
    { title: 'Sunday Family Hour', item: 'Family Feast', note: 'Before 7 pm', price: 6950, was: 7450, img: '1547573854-74d2a71d0826' },
    { title: 'Malai Monday', item: 'Malai Boti (10 pcs)', note: 'All day', price: 990, was: 1250, img: '1594266063697-304befca9629' },
    { title: 'Tikka Tuesday', item: 'Chicken Tikka (leg)', note: 'All day', price: 490, was: 650, img: '1652545296821-09a023a9fd08' },
    { title: 'Wing Wednesday', item: 'Fire Wings (8 pcs)', note: 'All day', price: 690, was: 890, img: '1765360024331-25b63e85272e' },
    { title: 'Karahi Thursday', item: 'Full Chicken Karahi', note: 'All day', price: 2890, was: 3400, img: '1708782340793-ec5f2159a689' },
    { title: 'Friday Roll Rush', item: '3 Seekh Kebab Rolls', note: 'After Jummah', price: 1290, was: 1560, img: '1719282431723-9d0f4370d4bc' },
    { title: 'Saturday Grill Tower', item: 'Ember Grill Tower', note: 'All day', price: 8990, was: 9950, img: '1632158930341-46604b637a0f' },
  ];

  export { CONFIG, CATEGORIES, MENU, PLATTERS, DAILY, img };

