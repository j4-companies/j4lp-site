#!/usr/bin/env python3
"""Generate individual agent bio pages under /agents/ from per-agent data."""
import os, json

AGENTS = [
    {
        "slug": "cuatro-strack",
        "first": "Cuatro",
        "last": "Strack",
        "name": "Cuatro Strack",
        "title": "Co-Founder · Broker of Record · Team Lead, J4 Heritage Group",
        "hero_subtitle": "Broker, J4 Legacy Properties · Co-Founder, the J4 Companies (<a href=\"https://www.j4tx.com\" target=\"_blank\" rel=\"noopener\">J4TX.com</a>)",
        "photo": "cuatro.jpg",
        "phone_display": "979-541-7248",
        "phone_tel": "9795417248",
        "email": "cuatro@j4lp.com",
        "trec": "655595",
        "meta_desc": "Cuatro Strack, Broker of Record at J4 Legacy Properties and Co-Founder of the J4 Companies. Texas A&M graduate (BS Agriculture Economics), licensed Texas broker, well driller, and OSSF sewage installer. Farm and ranch real estate across Texas.",
        "bio_paragraphs": [
            "Cuatro Strack is the Broker of Record at J4 Legacy Properties and Co-Founder, with his wife Stephanie, of every J4 company listed at <a href=\"https://www.j4tx.com\" target=\"_blank\" rel=\"noopener\">J4TX.com</a>. He is one of Texas's leading experts on ranch construction and development.",
            "Cuatro grew up in rural Wharton County and has been involved in the farming and ranching industry his whole life. As a high school student in El Campo in 1994, he began building high fences for deer and exotic game, security fencing, and field fencing as a part-time profession. He continued to build his company while attending Wharton Junior College and Blinn Junior College, then transferred to Texas A&amp;M University in College Station where he earned a Bachelor of Science in Agriculture Economics, graduating in 2002.",
            "Since then, the Stracks have built a connected ecosystem of businesses: <a href=\"https://www.j4fs.com\" target=\"_blank\" rel=\"noopener\">J4 Fencing &amp; Services</a> (high-game, ranch, commercial, and security fencing across Texas and the southern US, employing 50&ndash;65 people annually), <a href=\"https://www.j4water.com\" target=\"_blank\" rel=\"noopener\">J4 Water Works</a> (water wells and septic systems), <a href=\"https://www.j4prefabhomes.com\" target=\"_blank\" rel=\"noopener\">J4 Prefabricated Homes</a>, <a href=\"https://www.j4-properties.com\" target=\"_blank\" rel=\"noopener\">J4 Real Estate</a> (single-family and multi-family rentals), J4 Farm and Ranch / J4 Cattle (Registered Brahman and crossbred herds, plus grass-fed and grain-finished beef), <a href=\"https://www.whitewingbusinesses.com\" target=\"_blank\" rel=\"noopener\">White Wing Estates</a> (80-unit manufactured home community in El Campo) and White Wing Storage, and Southern Star Aviation.",
            "Through decades of fencing and ranch construction work, Cuatro has built relationships with hundreds of ranch owners across Texas. Those relationships now let him market high-end ranches to an elite network of buyers and quietly surface off-market opportunities for clients.",
            "Cuatro resides in El Campo, Texas, with his wife Stephanie and four children. For more on J4 Fencing &amp; Services, visit <a href=\"https://www.j4fs.com\" target=\"_blank\" rel=\"noopener\">j4fs.com</a>.",
        ],
        "areas_served": ["Texas (statewide farm &amp; ranch)", "El Campo, Wharton County (home base)", "Surrounding Gulf Coast counties: Matagorda, Austin, Colorado, Lavaca, Jackson, Fayette, Fort Bend", "Off-market ranch network statewide"],
        "specialties": ["High-end ranch sales", "Farm &amp; ranch property", "Ranch construction &amp; development", "Off-market ranch network", "Land valuation &amp; infrastructure assessment", "Water well &amp; septic system due diligence"],
        "designations": [
            "Texas A&amp;M University, BS Agriculture Economics (2002)",
            "Wharton Junior College &amp; Blinn Junior College (1997&ndash;1999)",
            "Texas Real Estate Broker License #655595",
            "TCEQ Class I OSSF Sewage Installer #OS0035582",
            "Apprentice Well Driller / Pump Installer #60869",
            "Texas Real Estate Brokerage License #9011917 (J4 Legacy Properties)",
            "Co-Founder, the J4 Companies (<a href=\"https://www.j4tx.com\" target=\"_blank\" rel=\"noopener\">J4TX.com</a>)",
            "Texas Agriculture Lifetime Leadership XIV Class (2014&ndash;2016)",
            "Dave Ramsey EntreLeadership Graduate (2008)",
            "NRA Lifetime Member",
            "Heritage Foundation Young President's Club Member",
            "City Development Corporation of El Campo, President",
            "El Campo Memorial Hospital, Board Member",
            "Cody Thompson Memorial Benefit, Chair",
        ],
    },
    {
        "slug": "stephanie-strack",
        "first": "Stephanie",
        "last": "Strack",
        "name": "Stephanie Strack",
        "title": "Co-Founder · Sales Agent · Team Lead, J4 Heritage Group",
        "hero_subtitle": "Sales Agent (TREC License #834781), J4 Legacy Properties · Co-Founder of J4 Legacy Properties and the J4 Companies (<a href=\"https://www.j4tx.com\" target=\"_blank\" rel=\"noopener\">J4TX.com</a>)",
        "photo": "stephanie.jpg",
        "phone_display": "979-637-0211",
        "phone_tel": "9796370211",
        "email": "stephanie@j4lp.com",
        "trec": "834781",
        "meta_desc": "Stephanie Strack, Co-Founder of J4 Legacy Properties and Sales Agent (TREC License #834781). Texas A&M Horticultural Sciences graduate, RENE certified, 20+ years building the J4 Companies ecosystem. Farm and ranch real estate across Texas.",
        "bio_paragraphs": [
            "Stephanie Strack is a co-founder of J4 Legacy Properties and, with her husband Cuatro, of every J4 company listed at <a href=\"https://www.j4tx.com\" target=\"_blank\" rel=\"noopener\">J4TX.com</a>. She is a licensed Texas Sales Agent (TREC License #834781). She grew up in a family of aviators and cropdusters in Texas, giving her an early, working perspective on agricultural operations and rural life.",
            "Stephanie graduated from Texas A&amp;M University in 2002 with a Bachelor of Science in Horticultural Sciences, bringing deep agricultural knowledge and land management expertise to her real estate practice. Since graduation, the Stracks have built a connected ecosystem of businesses: <a href=\"https://www.j4fs.com\" target=\"_blank\" rel=\"noopener\">J4 Fencing &amp; Services</a> (game, ranch, commercial, and security fencing across Texas and the southern US), <a href=\"https://www.j4water.com\" target=\"_blank\" rel=\"noopener\">J4 Water Works</a> (water wells and septic systems), <a href=\"https://www.j4prefabhomes.com\" target=\"_blank\" rel=\"noopener\">J4 Prefabricated Homes</a>, <a href=\"https://www.j4-properties.com\" target=\"_blank\" rel=\"noopener\">J4 Real Estate</a> (single-family and multi-family rentals), J4 Farm and Ranch / J4 Cattle (Registered Brahman and crossbred herds, plus grass-fed and grain-finished beef), <a href=\"https://www.whitewingbusinesses.com\" target=\"_blank\" rel=\"noopener\">White Wing Estates</a> (80-unit community in El Campo) and White Wing Storage, and Southern Star Aviation.",
            "In 2025, Stephanie obtained her Texas real estate license and earned her RENE (Real Estate Negotiation Expert) certification.",
            "As a co-founder of J4 Legacy Properties, Stephanie's focus is supporting and building a world-class team of agents. Her strengths are in the systems and processes that allow agents to operate at their full potential, and she has invested heavily in the marketing infrastructure behind the growth of The J4 Heritage Group inside J4 Legacy Properties.",
            "Stephanie's business management experience, combined with her focus on team development and operational rigor, makes her a resource for both clients and agents. She continues the family legacy of integrity, hard work, and service alongside her daughters Harleigh and Kayla, who are both licensed agents on the team.",
            "In her spare time, Stephanie homeschooled her four children, serves as 4-H Manager for the Wharton County Homeschool Group, secretary of Wharton County 4-H PALA, has participated in mission trips in the US, India, and El Salvador, volunteers with Manna Meals, and serves as President of CT Memorial, which raises money for kids with grit in the area in memory of her brother, Cody Thompson. In her spare time, she enjoys lifting weights, pilates, and hiking all 50 states. Stephanie resides in El Campo, Texas, with her husband and four children.",
        ],
        "areas_served": ["Texas (statewide farm &amp; ranch)", "Wharton County (home base)", "El Campo, Garwood, Driftwood Shores"],
        "specialties": ["Farm &amp; ranch real estate", "Team development &amp; agent support", "Negotiation (RENE certified)", "Marketing &amp; brand systems", "Cross-business J4 ecosystem coordination"],
        "designations": [
            "Texas A&amp;M University, BS Horticultural Sciences (2002)",
            "RENE, Real Estate Negotiation Expert",
            "Sales Agent, J4 Legacy Properties (TREC License #834781)",
            "Co-Founder, the J4 Companies (<a href=\"https://www.j4tx.com\" target=\"_blank\" rel=\"noopener\">J4TX.com</a>)",
            "Dave Ramsey EntreLeadership Graduate (2008)",
            "NRA Lifetime Member",
            "Heritage Foundation Young President's Club Member",
            "President, CT Memorial (Cody Thompson Memorial Benefit Chair, 2018&ndash;present)",
            "4-H Manager, Wharton County Homeschool Group (2017&ndash;present)",
            "Secretary, Wharton County 4-H PALA",
            "Manna Meals Volunteer (2012&ndash;present)",
            "Mission Trips: US, India, and El Salvador (2012&ndash;present)",
        ],
    },
    {
        "slug": "sioux-smith",
        "first": "Sioux",
        "last": "Smith",
        "name": "Sioux Smith",
        "title": "Co-Founder, J4 Legacy Properties · Broker",
        "hero_subtitle": "Co-Founder, J4 Legacy Properties, LLC · Broker Individual (TREC License #650949) · Farm &amp; Ranch Specialist",
        "photo": "sioux.jpg",
        "phone_display": "254-541-6919",
        "phone_tel": "2545416919",
        "email": "sioux@j4lp.com",
        "trec": "650949",
        "meta_desc": "Sioux Smith, Co-Founder of J4 Legacy Properties, LLC and Broker Individual (TREC License #650949). WPRA Texas Circuit Finals qualifier and AQHA member. Farm and ranch real estate with deep equestrian land expertise across Texas.",
        "bio_paragraphs": [
            "Sioux Smith is a co-founder of J4 Legacy Properties, LLC, which she started alongside her brother Cuatro Strack and her sister-in-law Stephanie Strack. She holds her own Texas Real Estate Broker license (TREC License #650949) and operates as an independent Broker Individual. A trusted farm &amp; ranch real estate expert, Sioux raises and trains barrel horses and has qualified for the WPRA Texas Circuit Finals several times. A member of the Women's ProRodeo Association and the American Quarter Horse Association, she knows horses, knows land, and is well equipped to assist in all aspects of farm &amp; ranch real estate.",
            "Sioux grew up in El Campo and Lampasas, Texas. A graduate of Coastal Bend College, she and her family reside in Simonton, Texas.",
            "Sioux brings particular depth on horse properties, equestrian land, and the practical infrastructure questions that come with ranch ownership.",
        ],
        "areas_served": ["Farm &amp; ranch property anywhere in Texas", "Simonton, Fulshear, and the western Houston corridor", "Fort Bend, Wharton, Austin, Colorado counties", "Lampasas County and Central Texas"],
        "specialties": ["Farm &amp; ranch property", "Horse properties &amp; equestrian land", "Working cattle operations", "Coastal Bend &amp; Central Texas land"],
        "designations": ["Coastal Bend College graduate", "WPRA (Women's ProRodeo Association) member", "AQHA (American Quarter Horse Association) member", "WPRA Texas Circuit Finals qualifier"],
    },
    {
        "slug": "harleigh-strack",
        "first": "Harleigh",
        "last": "Strack",
        "name": "Harleigh Strack",
        "title": "Agent, J4 Heritage Group",
        "hero_subtitle": "Agent, J4 Legacy Properties · Founder, <a href=\"https://www.hspspower.com\" target=\"_blank\" rel=\"noopener\">High Standards Power Solutions</a> · Commercial Pilot &amp; CFI, HS Flight Services",
        "photo": "harleigh.jpg",
        "phone_display": "979-253-4837",
        "phone_tel": "9792534837",
        "email": "harleigh@j4lp.com",
        "trec": "810470",
        "meta_desc": "Harleigh Strack, Agent at J4 Legacy Properties. Texas A&M 2025 Ag Econ graduate (honors), founder of High Standards Power Solutions, commercial pilot and CFI through HS Flight Services. Farm and ranch real estate across Texas.",
        "bio_paragraphs": [
            "Growing up alongside her father, Cuatro Strack, the Broker of J4 Legacy Properties, Harleigh learned the value of integrity, hard work, and quality land from an early age. Her experience raising whitetail deer and Brahman cattle has given her an authentic understanding of what buyers and sellers need when investing in farm and ranch properties.",
            "Harleigh graduated from Texas A&amp;M University in May 2025 with a Bachelor of Science in Agricultural Economics, with minors in Agribusiness Entrepreneurship and AgriFood Sales. She completed the Agricultural Economics Honors Program and earned the Distinguished Student Award in Spring 2024. While at A&amp;M, she served as President of the Women in Aviation Texas A&amp;M Chapter, Social Media Officer for the Agricultural Economics Society, and participated in Real Estate Aggies in Leadership.",
            "Driven and accomplished, Harleigh has been pursuing her goals since she was young. She holds her Commercial Single and Multi-Engine Pilot's License and Certified Flight Instructor (CFI) certification, with over 500 total flight hours logged through her own aviation business, HS Flight Services, where she flies commercial pilot work and teaches ground school and flight instruction to private and commercial pilot students. She is also a licensed real estate agent and manufactured home salesperson.",
            "Harleigh is the founder of <a href=\"https://www.hspspower.com\" target=\"_blank\" rel=\"noopener\"><strong>High Standards Power Solutions, LLC</strong></a>, a backup generator sales, installation, and maintenance business serving Texas customers with reliable power solutions. She is also a real estate investor, a combination that reflects her ambition and her commitment to building things that last.",
        ],
        "areas_served": ["Farm and ranch property throughout Texas", "Wharton, Matagorda, Austin, Colorado, Lavaca, Jackson counties", "El Campo and College Station home bases", "Hunting land and ag-exempt acreage"],
        "specialties": ["Farm &amp; ranch property", "Hunting land &amp; wildlife exemption", "Manufactured home sales", "Land with infrastructure needs (water, power, fencing)", "Aviation property &amp; hangar access"],
        "designations": [
            "Texas A&amp;M University, BS Agricultural Economics (May 2025)",
            "Minors: Agribusiness Entrepreneurship &amp; AgriFood Sales",
            "Agricultural Economics Honors Program",
            "Distinguished Student Award (Spring 2024)",
            "Commercial Single &amp; Multi-Engine Pilot's License",
            "Certified Flight Instructor (CFI), 500+ total flight hours",
            "Texas Real Estate License #810470",
            "Manufactured Home Salesperson License",
            "Founder, High Standards Power Solutions, LLC",
            "Founder, HS Flight Services (Commercial Pilot &amp; CFI)",
            "President, Women in Aviation, Texas A&amp;M Chapter (2023&ndash;present)",
        ],
    },
    {
        "slug": "kayla-strack",
        "first": "Kayla",
        "last": "Strack",
        "name": "Kayla Strack",
        "title": "Agent, J4 Heritage Group",
        "hero_subtitle": "Agent, J4 Legacy Properties · El Campo &amp; Hallettsville · Certified Doula",
        "photo": "kayla.jpg",
        "phone_display": "979-332-9246",
        "phone_tel": "9793329246",
        "email": "kayla@j4lp.com",
        "trec": "829525",
        "meta_desc": "Kayla Strack, Agent at J4 Legacy Properties. Based in El Campo (Wharton County) and Hallettsville (Lavaca County). Certified Doula. Helping buyers and sellers across the Wharton and Lavaca County areas.",
        "bio_paragraphs": [
            "Kayla is a dedicated real estate agent based between El Campo and Hallettsville, Texas. Focused on helping clients find homes and land that fit their life, she takes the time to listen and to make real connections through the process.",
            "As a lifelong resident of the Wharton and Lavaca County area, she has a deep understanding of the local market and a strong commitment to serving her community. Whether buying or selling, Kayla guides clients through the process with personal service and a steady, grounded approach.",
            "Beyond real estate, Kayla is also a Certified Doula, supporting growing families through some of the most meaningful moments of their lives. That same instinct for showing up for people, calmly and prepared, is exactly how she shows up for her clients.",
        ],
        "areas_served": ["El Campo, Wharton County (home base)", "Hallettsville, Lavaca County (home base)", "Surrounding counties: Matagorda, Jackson, Colorado, Austin, Fayette"],
        "specialties": ["El Campo &amp; Hallettsville area homes and small acreage", "First-time buyers", "Local market knowledge across Wharton and Lavaca counties", "Community-focused service"],
        "designations": ["Texas Real Estate License #829525", "Certified Doula", "Lifelong El Campo / Hallettsville area resident"],
    },
    {
        "slug": "julia-velazquez",
        "first": "Julia",
        "last": "Velazquez",
        "name": "Julia Velazquez",
        "title": "Agent, J4 Heritage Group",
        "hero_subtitle": "Agent, J4 Legacy Properties · Sales, <a href=\"https://www.j4prefabhomes.com\" target=\"_blank\" rel=\"noopener\">J4 Prefabricated Homes</a> &amp; <a href=\"https://www.j4water.com\" target=\"_blank\" rel=\"noopener\">J4 Water Works</a>",
        "photo": "julia.jpg",
        "phone_display": "979-320-7285",
        "phone_tel": "9793207285",
        "email": "julia@j4lp.com",
        "trec": "826810",
        "meta_desc": "Julia Velazquez, Agent at J4 Legacy Properties and Sales Rep for J4 Prefabricated Homes and J4 Water Works. El Campo native, WCJC graduate, Licensed Vocational Nurse, TCEQ OSSF Apprentice. Real estate across Wharton County and surrounding Texas.",
        "bio_paragraphs": [
            "Julia Velazquez is a proud native of El Campo, TX, where she continues to call home. She earned an Associate's Degree in General Studies from WCJC and is a Licensed Vocational Nurse.",
            "Julia is known for her tenacious work ethic and her dedication to her clients. She maintains constant communication throughout the process and consistently goes above and beyond typical Realtor duties. Julia is committed to making each real estate transaction smooth and clear, from first conversation to closing.",
            "Beyond real estate, Julia is also a Sales Representative for <a href=\"https://www.j4prefabhomes.com\" target=\"_blank\" rel=\"noopener\">J4 Prefabricated Homes</a> and <a href=\"https://www.j4water.com\" target=\"_blank\" rel=\"noopener\">J4 Water Works</a>, and holds a TCEQ OSSF (On-Site Sewage Facility) Apprentice license under the name Julia Loredo. That cross-training gives her a working knowledge of the full J4 Companies ecosystem and what it takes to put together a complete rural property package, including manufactured home placement, water well, and septic.",
        ],
        "areas_served": ["El Campo, TX (home base)", "Wharton County", "Surrounding counties: Matagorda, Jackson, Colorado, Austin", "Bilingual service available"],
        "specialties": ["El Campo area homes &amp; acreage", "Buyer and seller representation", "J4 Prefabricated Homes coordination", "J4 Water Works (well &amp; septic) coordination"],
        "designations": ["Texas Real Estate License #826810", "Associate's Degree, WCJC (Wharton County Junior College)", "Licensed Vocational Nurse (LVN)", "TCEQ OSSF Apprentice (Julia Loredo)", "Sales Representative, J4 Prefabricated Homes", "Sales Representative, J4 Water Works"],
    },
    {
        "slug": "alexa-emmons",
        "first": "Alexa",
        "last": "Emmons",
        "name": "Alexa Emmons",
        "title": "Sales Agent",
        "hero_subtitle": "Sales Agent (TREC License #637684) · Sponsored by <a href=\"sioux-smith.html\">Sioux Smith, Broker</a> (TREC License #650949) · Professional Barrel Racer · Beefmaster Cattle Family",
        "photo": "alexa.jpg",
        "phone_display": "281-323-1000",
        "phone_tel": "2813231000",
        "email": "alexa@j4lp.com",
        "trec": "637684",
        "meta_desc": "Alexa Emmons, Sales Agent (TREC License #637684) sponsored by Sioux Smith, Broker (TREC License #650949). 10+ years in real estate. Serving Limestone, Freestone, and Navarro counties. Lives on a Beefmaster cattle ranch in Fairfield, TX.",
        "bio_paragraphs": [
            "Alexa Emmons is a Texas Sales Agent (TREC License #637684), sponsored by Sioux Smith, Broker (TREC License #650949). A native Houstonian with a lifelong love of horses and real estate, Alexa followed both to College Station, TX, where she landed her first job in real estate as an executive assistant to a top-producing boutique brokerage. Her early years as a licensed agent gave her firsthand experience in rentals, investments, and rural acreage.",
            "Alongside her real estate career, Alexa is a professional barrel racer. She has competed in rodeos across the country and into Canada and earned multiple awards in the arena. That competitive drive translates directly into how she works for clients, she goes the extra mile every time.",
            "Marriage and children eventually slowed life down, and her family now lives on the family's Beefmaster cattle ranch in Fairfield, TX. With over 10 years of experience in real estate, Alexa serves buyers and sellers across Limestone, Freestone, and Navarro counties with the knowledge and judgment to guide them through what can be a complicated process.",
        ],
        "areas_served": ["Limestone County, Texas", "Freestone County, Texas (Fairfield home base)", "Navarro County, Texas"],
        "specialties": ["Cattle ranch &amp; working ag property", "Rural acreage and country homes", "Rentals &amp; multi-property investors", "Buyers relocating from Houston, DFW, or Austin"],
        "designations": ["Texas Real Estate License #637684", "10+ years of real estate experience", "Professional barrel racer (multi-region competitor)", "Beefmaster cattle family"],
    },
    {
        "slug": "rozanna-roach",
        "first": "Roz",
        "last": "Roach",
        "name": "Roz Roach",
        "title": "Agent, J4 Heritage Group",
        "hero_subtitle": "Agent, J4 Legacy Properties · Rosenberg, TX · Administrative Assistant, Lamar CISD",
        "photo": "rozanna.jpg",
        "phone_display": "281-615-2355",
        "phone_tel": "2816152355",
        "email": "rozanna@j4lp.com",
        "trec": "825241",
        "meta_desc": "Roz Roach, Agent at J4 Legacy Properties based in Rosenberg, TX. Full-time administrative assistant at Lamar CISD with 25+ years in education. Service-first approach for buyers and sellers in Fort Bend, Wharton, and surrounding Texas counties.",
        "bio_paragraphs": [
            "Roz Roach brings a strong foundation of hard work, integrity, and service to her role at J4 Legacy Properties. Raised with small-town values, she developed a deep appreciation for community, connection, and a genuine way of life, principles that continue to guide her today. Now based in Rosenberg, Texas, she remains rooted in those same values.",
            "Family is at the center of Roz's life. She is a proud mother of two grown children, both happily married, and a joyful grandmother (\"Lolly\") to four grandchildren. She enjoys staying active, spending time outdoors, and making meaningful memories with her family.",
            "Roz currently works full-time at Lamar CISD as an administrative assistant, drawing on over 25 years in education supporting leadership and working alongside teams across multiple departments. Her career has always been centered around service, anticipating needs, solving problems, and ensuring others feel supported and valued.",
            "Roz brings that same commitment into real estate. She believes every client deserves an agent who listens, understands their goals, and operates with honesty and care throughout the entire process. Whether you're buying your first home, searching for your next chapter, or selling a property filled with memories, Roz is there to make each step smooth and meaningful.",
        ],
        "areas_served": ["Rosenberg, TX (home base)", "Fort Bend County", "Wharton County (East Bernard, Wharton, Louise)", "Greater Houston southwest corridor"],
        "specialties": ["Homes &amp; small acreage", "Move-up and downsizing buyers", "Sellers with legacy properties", "Service-first communication"],
        "designations": ["Texas Real Estate License #825241", "Administrative Assistant, Lamar CISD (currently full-time)", "25+ years in education", "Based in Rosenberg, TX"],
    },
    {
        "slug": "mason-abshire",
        "first": "Mason",
        "last": "Abshire",
        "name": "Mason Abshire",
        "title": "Agent, J4 Heritage Group",
        "hero_subtitle": "Agent, J4 Legacy Properties · Fourth-Generation North Texan",
        "photo": "mason.jpg",
        "phone_display": "970-406-1187",
        "phone_tel": "9704061187",
        "email": "mason@j4lp.com",
        "trec": "834823",
        "meta_desc": "Mason Abshire, Agent at J4 Legacy Properties. Fourth-generation North Texan, TCU graduate, conservationist, and entrepreneur. Land sales and recreational property specialist serving North Texas and beyond.",
        "bio_paragraphs": [
            "A proud fourth-generation North Texan, Mason Abshire was born and raised in Fort Worth, where his roots in the land run deep. After earning his degree from Texas Christian University, Mason built a career centered on adventure and appreciation for the outdoors, working with leading outdoor expedition companies across Texas and Colorado. These experiences shaped his understanding of the land's beauty, value, and potential, insight he now brings to every client relationship.",
            "An entrepreneur at heart, Mason owns and operates three businesses: a property management services company partnering with commercial and private clients, a commercial mowing company, and a personal training studio focused on helping others live healthy, active lives. That multi-business experience gives him a useful perspective on land stewardship, property ownership, and the lifestyle that comes with both.",
            "As a landowner and conservationist, Mason is committed to preserving the natural character of Texas while helping others find their own piece of it. His focus is on matching discerning buyers with properties where heritage, potential, and natural beauty come together.",
            "Outside of work, Mason finds joy in the great outdoors, whether hiking, biking, canoeing, snowboarding, or rafting, and cherishes every opportunity to share those experiences with his wife and their two children. He continues to explore and celebrate the Texas landscapes that inspire his work every day.",
        ],
        "areas_served": ["Fort Worth and the DFW Metroplex", "North Texas recreational and ranch acreage", "Hunting land and conservation-minded buyers", "Texas statewide for the right client"],
        "specialties": ["Recreational and outdoor lifestyle properties", "Land conservation &amp; stewardship", "Property management", "Investment land &amp; multi-property buyers"],
        "designations": ["Texas Christian University graduate", "Texas Real Estate License", "Owner/Operator, three Texas businesses (property management, commercial mowing, personal training)", "Fourth-generation Texan"],
    },
]


HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="description" content="{meta_desc}">
<meta name="keywords" content="{name}, J4 Legacy Properties agent, {title_plain}, Texas land agent, ranch real estate Texas, El Campo real estate, Wharton County, J4 Heritage Group">
<meta property="og:title" content="{name}, {title_short} | J4 Legacy Properties">
<meta property="og:description" content="{meta_desc}">
<meta property="og:url" content="https://www.j4lp.com/agents/{slug}">
<meta property="og:type" content="profile">
<meta property="og:image" content="https://www.j4lp.com/images/team/{photo}">
<title>{name}, {title_short} | J4 Legacy Properties | El Campo, TX</title>
<link rel="canonical" href="https://www.j4lp.com/agents/{slug}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Arvo:wght@400;700&family=Nunito:wght@300;400;600;700&family=Lora:ital,wght@0,400;0,600;1,400;1,600&display=swap" rel="stylesheet">
<script type="application/ld+json">
{schema_json}
</script>
<style>
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
html {{ scroll-behavior: smooth; }}
body {{ font-family: 'Nunito', sans-serif; color: #131414; background: #fff; overflow-x: hidden; line-height: 1.6; }}
img {{ max-width: 100%; display: block; }}
a {{ text-decoration: none; color: inherit; }}
ul {{ list-style: none; }}
:root {{
  --maroon: #500203; --maroon-mid: #6b0304; --gold: #c8a96e; --gold-light: #e8d4a8;
  --black: #131414; --charcoal: #1e1e1e; --dark-gray: #7F8194; --mid-gray: #a0a0a8;
  --light-gray: #d3d5e4; --off-white: #f7f5f0; --warm-white: #faf9f6; --white: #ffffff;
  --nav-height: 80px;
}}
.arvo {{ font-family: 'Arvo', serif; }}
.lora {{ font-family: 'Lora', serif; }}

/* TOPBAR */
.topbar {{ background: var(--black); padding: 8px 40px; display: flex; justify-content: space-between; align-items: center; }}
.topbar-left {{ font-size: 11px; color: rgba(255,255,255,0.55); letter-spacing: 0.1em; text-transform: uppercase; }}
.topbar-right {{ display: flex; gap: 24px; align-items: center; }}
.topbar-right a {{ font-size: 11px; color: rgba(255,255,255,0.55); letter-spacing: 0.08em; text-transform: uppercase; transition: color 0.2s; }}
.topbar-right a:hover {{ color: var(--gold); }}
.topbar-phone {{ color: var(--gold) !important; font-weight: 700; }}

/* NAV */
.nav {{ position: sticky; top: 0; z-index: 1000; background: var(--white); border-bottom: 1px solid rgba(0,0,0,0.08); height: var(--nav-height); display: flex; align-items: center; justify-content: space-between; padding: 0 40px; transition: box-shadow 0.3s; }}
.nav.scrolled {{ box-shadow: 0 2px 20px rgba(0,0,0,0.12); }}
.nav-logo-text .brand-name {{ font-family: 'Arvo', serif; font-size: 18px; font-weight: 700; color: var(--black); letter-spacing: 0.04em; }}
.nav-logo-text .brand-name span {{ color: var(--maroon); }}
.nav-logo-text .brand-sub {{ font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--dark-gray); margin-top: 2px; }}
.nav-links {{ display: flex; gap: 32px; align-items: center; }}
.nav-links > li > a {{ font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: var(--black); padding: 8px 0; transition: color 0.2s; display: block; }}
.nav-links > li > a:hover {{ color: var(--maroon); }}
.dropdown {{ position: relative; }}
.dropdown-menu {{ display: none; position: absolute; top: 100%; left: 0; min-width: 200px; background: var(--white); border: 1px solid rgba(0,0,0,0.08); border-top: 3px solid var(--maroon); box-shadow: 0 12px 40px rgba(0,0,0,0.12); z-index: 100; }}
.dropdown:hover .dropdown-menu {{ display: block; }}
.dropdown-menu a {{ display: block; padding: 11px 18px; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--black); border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.15s, color 0.15s; }}
.dropdown-menu a:hover {{ background: var(--off-white); color: var(--maroon); }}
.nav-cta {{ background: var(--maroon); color: var(--white) !important; padding: 11px 22px; font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; transition: background 0.2s; }}
.nav-cta:hover {{ background: var(--maroon-mid); }}
.nav-hamburger {{ display: none; flex-direction: column; gap: 5px; cursor: pointer; padding: 4px; }}
.nav-hamburger span {{ display: block; width: 24px; height: 2px; background: var(--black); }}
.mobile-menu {{ display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: var(--black); z-index: 2000; flex-direction: column; padding: 40px; overflow-y: auto; }}
.mobile-menu.open {{ display: flex; }}
.mobile-close {{ position: absolute; top: 24px; right: 32px; font-size: 28px; color: var(--white); cursor: pointer; background: none; border: none; }}
.mobile-logo {{ font-family: 'Arvo', serif; font-size: 22px; font-weight: 700; color: var(--white); margin-bottom: 3rem; }}
.mobile-logo span {{ color: var(--gold); }}
.mobile-links a {{ display: block; font-size: 13px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(255,255,255,0.75); padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }}
.mobile-contact {{ margin-top: auto; padding-top: 2rem; font-size: 13px; color: rgba(255,255,255,0.45); line-height: 1.8; }}
.mobile-contact a {{ color: var(--gold); }}

/* BREADCRUMB */
.breadcrumb-bar {{ padding: 14px 80px; background: var(--off-white); border-bottom: 1px solid var(--light-gray); }}
.breadcrumb {{ font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--dark-gray); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }}
.breadcrumb a {{ color: var(--dark-gray); transition: color 0.2s; }}
.breadcrumb a:hover {{ color: var(--maroon); }}
.breadcrumb-sep {{ color: var(--light-gray); }}
.breadcrumb-current {{ color: var(--maroon); }}

/* AGENT HERO */
.agent-hero {{ background: var(--off-white); padding: 64px 80px 48px; border-bottom: 1px solid var(--light-gray); }}
.agent-hero-inner {{ max-width: 1200px; margin: 0 auto; }}
.agent-team-tag {{ font-size: 11px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--maroon); margin-bottom: 14px; display: flex; align-items: center; gap: 10px; }}
.agent-team-tag::before {{ content: ''; display: block; width: 20px; height: 1px; background: var(--maroon); }}
.agent-hero h1 {{ font-family: 'Arvo', serif; font-size: clamp(36px, 6vw, 72px); font-weight: 700; color: var(--maroon); line-height: 1.05; margin-bottom: 14px; }}
.agent-hero-sub {{ font-family: 'Lora', serif; font-style: italic; font-size: clamp(16px, 1.6vw, 20px); color: var(--dark-gray); line-height: 1.5; max-width: 760px; }}

/* AGENT BODY */
.agent-body {{ padding: 56px 80px; }}
.agent-body-inner {{ max-width: 1200px; margin: 0 auto; display: grid; grid-template-columns: 1fr 380px; gap: 64px; align-items: start; }}
.agent-left {{ }}
.agent-right {{ position: sticky; top: calc(var(--nav-height) + 24px); }}
.agent-bio p {{ font-size: 16px; color: var(--charcoal); line-height: 1.85; margin-bottom: 18px; }}
.agent-bio p a {{ color: var(--maroon); border-bottom: 1px solid var(--maroon); }}
.agent-bio p a:hover {{ background: var(--maroon); color: var(--white); }}

.section-block {{ margin-top: 40px; }}
.section-block h2 {{ font-family: 'Arvo', serif; font-size: 18px; font-weight: 700; color: var(--black); margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1px solid var(--light-gray); }}
.section-block ul {{ display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }}
.section-block li {{ font-size: 14px; color: var(--charcoal); padding: 6px 0; display: flex; align-items: flex-start; gap: 10px; line-height: 1.5; }}
.section-block li::before {{ content: '·'; color: var(--maroon); font-weight: 700; font-size: 18px; line-height: 1; }}

/* AGENT PHOTO + CONTACT CARD */
.agent-photo-wrap {{ overflow: hidden; margin-bottom: 18px; background: var(--off-white); aspect-ratio: 4/5; }}
.agent-photo-wrap img {{ width: 100%; height: 100%; object-fit: cover; }}
.agent-contact-card {{ background: var(--black); padding: 28px; color: var(--white); }}
.agent-contact-card .label {{ font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); margin-bottom: 14px; display: block; }}
.agent-contact-card .row {{ display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.08); }}
.agent-contact-card .row:last-of-type {{ border-bottom: none; }}
.agent-contact-card .row svg {{ width: 18px; height: 18px; color: var(--gold); flex-shrink: 0; }}
.agent-contact-card .row a {{ color: var(--white); font-weight: 700; font-size: 15px; }}
.agent-contact-card .row a:hover {{ color: var(--gold); }}
.agent-contact-card .trec {{ margin-top: 14px; font-size: 11px; color: rgba(255,255,255,0.5); letter-spacing: 0.06em; }}
.agent-contact-card .trec a {{ color: rgba(255,255,255,0.5); }}
.agent-contact-card .trec a:hover {{ color: var(--gold); }}
.agent-contact-card .btn-contact {{ display: block; text-align: center; padding: 14px; background: var(--maroon); color: var(--white); font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; margin-top: 18px; transition: background 0.2s; }}
.agent-contact-card .btn-contact:hover {{ background: var(--maroon-mid); }}

/* CTA STRIP */
.agent-cta {{ background: var(--maroon); padding: 56px 80px; }}
.agent-cta-inner {{ max-width: 1200px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 32px; flex-wrap: wrap; }}
.agent-cta h2 {{ font-family: 'Arvo', serif; font-size: clamp(20px, 2.4vw, 28px); color: var(--white); margin-bottom: 8px; line-height: 1.3; }}
.agent-cta p {{ font-size: 14px; color: rgba(255,255,255,0.7); max-width: 560px; line-height: 1.7; }}
.btn-gold {{ background: var(--gold); color: var(--black); font-size: 11px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; padding: 14px 26px; white-space: nowrap; display: inline-block; transition: background 0.2s; }}
.btn-gold:hover {{ background: var(--gold-light); }}

/* FOOTER */
.footer {{ background: var(--charcoal); padding: 56px 80px 36px; }}
.footer-top {{ display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 40px; padding-bottom: 40px; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 28px; }}
.footer-brand-name {{ font-family: 'Arvo', serif; font-size: 18px; font-weight: 700; color: var(--white); margin-bottom: 4px; }}
.footer-brand-name span {{ color: var(--gold); }}
.footer-tagline {{ font-family: 'Lora', serif; font-style: italic; font-size: 13px; color: var(--gold); margin-bottom: 14px; }}
.footer-about {{ font-size: 12px; color: rgba(255,255,255,0.4); line-height: 1.8; }}
.footer-col h4 {{ font-size: 10px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: var(--gold); margin-bottom: 14px; }}
.footer-col a {{ display: block; font-size: 12px; color: rgba(255,255,255,0.45); margin-bottom: 8px; transition: color 0.2s; }}
.footer-col a:hover {{ color: var(--white); }}
.footer-bottom {{ display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }}
.footer-bottom p, .footer-bottom a {{ font-size: 11px; color: rgba(255,255,255,0.25); }}
.trec-bar {{ background: var(--black); padding: 12px 80px; text-align: center; font-size: 10px; color: rgba(255,255,255,0.2); letter-spacing: 0.06em; }}

@media (max-width: 1100px) {{
  .agent-body-inner {{ grid-template-columns: 1fr; gap: 40px; }}
  .agent-right {{ position: static; }}
  .agent-hero {{ padding: 48px 40px 36px; }}
  .agent-body {{ padding: 40px; }}
  .agent-cta {{ padding: 48px 40px; }}
  .footer {{ padding: 48px 40px 32px; }}
  .footer-top {{ grid-template-columns: 1fr 1fr; }}
  .trec-bar {{ padding: 12px 40px; }}
  .breadcrumb-bar {{ padding: 14px 40px; }}
  .section-block ul {{ grid-template-columns: 1fr; }}
}}
@media (max-width: 768px) {{
  .topbar {{ display: none; }}
  .nav {{ padding: 0 20px; height: 64px; }}
  .nav-links {{ display: none; }}
  .nav-cta {{ display: none; }}
  .nav-hamburger {{ display: flex; }}
  .agent-hero {{ padding: 36px 20px 28px; }}
  .agent-body {{ padding: 32px 20px; }}
  .agent-cta {{ padding: 36px 20px; }}
  .footer {{ padding: 40px 20px 28px; }}
  .footer-top {{ grid-template-columns: 1fr; gap: 28px; }}
  .footer-bottom {{ flex-direction: column; text-align: center; }}
  .trec-bar {{ padding: 12px 20px; }}
  .breadcrumb-bar {{ padding: 12px 20px; }}
}}
</style>
</head>
<body>

<div class="topbar">
  <span class="topbar-left">J4 Legacy Properties, LLC · El Campo, Texas · TREC Licensed Brokerage</span>
  <div class="topbar-right">
    <a href="mailto:info@j4lp.com">info@j4lp.com</a>
    <a href="tel:8335435263" class="topbar-phone">833-543-LAND</a>
  </div>
</div>

<nav class="nav" id="mainNav">
  <a href="../index.html" class="nav-logo">
    <img src="../images/brand/J4LP-Logo-Horizontal-Wide-Transparent.png" alt="J4 Legacy Properties" style="height:90px;width:auto;display:block;">
  </a>
  <ul class="nav-links">
    <li class="dropdown">
      <a href="../properties.html">Properties</a>
      <div class="dropdown-menu">
        <a href="../properties.html">All Listings</a>
        <a href="../properties.html?tab=ranch">Ranch &amp; Farm Land</a>
        <a href="../properties.html?tab=homes">El Campo Area Homes</a>
        <a href="../properties.html?tab=1031">1031-Friendly Land</a>
      </div>
    </li>
    <li><a href="../buying.html">Buying</a></li>
    <li><a href="../selling.html">Selling</a></li>
    <li><a href="../our-team.html">Our Team</a></li>
    <li><a href="../resources.html">Resources</a></li>
    <li><a href="../ecosystem.html">J4 Ecosystem</a></li>
  </ul>
  <a href="../contact.html" class="nav-cta">Let's Connect</a>
  <div class="nav-hamburger" id="hamburger"><span></span><span></span><span></span></div>
</nav>

<div class="mobile-menu" id="mobileMenu">
  <button class="mobile-close" id="mobileClose">×</button>
  <div class="mobile-logo">J4 <span>Legacy Properties</span></div>
  <div class="mobile-links">
    <a href="../properties.html">Properties</a>
    <a href="../buying.html">Buying</a>
    <a href="../selling.html">Selling</a>
    <a href="../our-team.html">Our Team</a>
    <a href="../resources.html">Resources</a>
    <a href="../contact.html">Contact</a>
  </div>
  <div class="mobile-contact">
    <a href="tel:8335435263">833-543-LAND</a><br>
    <a href="mailto:info@j4lp.com">info@j4lp.com</a>
  </div>
</div>

<div class="breadcrumb-bar">
  <div class="breadcrumb">
    <a href="../index.html">Home</a>
    <span class="breadcrumb-sep">›</span>
    <a href="../our-team.html">Our Team</a>
    <span class="breadcrumb-sep">›</span>
    <span class="breadcrumb-current">{name}</span>
  </div>
</div>

<section class="agent-hero">
  <div class="agent-hero-inner">
    <div class="agent-team-tag">{team_tag}</div>
    <h1 class="arvo">{name}</h1>
    <p class="agent-hero-sub">{hero_subtitle}</p>
  </div>
</section>

<section class="agent-body">
  <div class="agent-body-inner">
    <div class="agent-left">
      <div class="agent-bio">
{bio_html}
      </div>

      <div class="section-block">
        <h2 class="arvo">Areas Served</h2>
        <ul>
{areas_html}
        </ul>
      </div>

      <div class="section-block">
        <h2 class="arvo">Specialties</h2>
        <ul>
{specialties_html}
        </ul>
      </div>

      <div class="section-block">
        <h2 class="arvo">Credentials &amp; Background</h2>
        <ul>
{designations_html}
        </ul>
      </div>
    </div>

    <aside class="agent-right">
      <div class="agent-photo-wrap">
        <img src="../images/team/{photo}" alt="{name}, {title_plain}" loading="lazy">
      </div>
      <div class="agent-contact-card">
        <span class="label">Contact {first}</span>
        <div class="row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.27 9.17 19.79 19.79 0 01.22 4.13 2 2 0 012.12 2h3a2 2 0 012 1.72 12 12 0 00.65 2.6 2 2 0 01-.45 2.11l-1.27 1.27a16 16 0 006.72 6.72l1.27-1.27a2 2 0 012.11-.45 12 12 0 002.6.65A2 2 0 0122 16.92z"/></svg>
          <a href="tel:{phone_tel}">{phone_display}</a>
        </div>
        <div class="row">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
          <a href="mailto:{email}">{email}</a>
        </div>
        <div class="trec">
          <a href="https://www.trec.texas.gov/agency/license-holder-search" target="_blank" rel="noopener">TREC #{trec}</a>
        </div>
        <a href="../contact.html?agent={slug_short}" class="btn-contact">Send {first} a Message</a>
      </div>
    </aside>
  </div>
</section>

<section class="agent-cta">
  <div class="agent-cta-inner">
    <div>
      <h2 class="arvo">Buying or selling Texas land?</h2>
      <p>Give {first} a call at <a href="tel:{phone_tel}" style="color:var(--gold);font-weight:700">{phone_display}</a> or send an email at <a href="mailto:{email}" style="color:var(--gold);font-weight:700">{email}</a>. We do not push, we listen first.</p>
    </div>
    <a href="../contact.html?agent={slug_short}" class="btn-gold">Start a Conversation</a>
  </div>
</section>

<footer class="footer">
  <div class="footer-top">
    <div>
      <div class="footer-brand-name arvo">J4 <span>Legacy Properties</span></div>
      <div class="footer-tagline lora">Building your legacy, one property at a time.</div>
      <p class="footer-about">J4 Legacy Properties is a Texas land and ranch real estate brokerage based in El Campo helping buyers and sellers invest in farms, ranches, and legacy acreage across Texas.</p>
    </div>
    <div class="footer-col">
      <h4>Navigate</h4>
      <a href="../index.html">Home</a>
      <a href="../properties.html">All Properties</a>
      <a href="../buying.html">Buying</a>
      <a href="../selling.html">Selling</a>
      <a href="../our-team.html">Our Team</a>
      <a href="../contact.html">Contact</a>
    </div>
    <div class="footer-col">
      <h4>Property Types</h4>
      <a href="../properties.html?tab=ranch">Ranch &amp; Farm Land</a>
      <a href="../properties.html?tab=homes">El Campo Area Homes</a>
      <a href="../properties.html?tab=1031">1031-Friendly Land</a>
      <a href="../off-market.html">Off-Market</a>
    </div>
    <div class="footer-col">
      <h4>Contact</h4>
      <a href="tel:8335435263">833-543-LAND</a>
      <a href="mailto:info@j4lp.com">info@j4lp.com</a>
      <a href="https://www.google.com/maps/dir/?api=1&amp;destination=1379+CR+408+El+Campo+TX+77437" target="_blank" rel="noopener">1379 CR 408, El Campo TX</a>
      <a href="https://www.j4tx.com" target="_blank">J4TX.com</a>
    </div>
  </div>
  <div class="footer-bottom">
    <p>© 2026 J4 Legacy Properties, LLC · All Rights Reserved</p>
    <a href="../privacy.html">Privacy Policy</a>
  </div>
</footer>
<div class="trec-bar">
  J4 Legacy Properties, LLC · TREC Licensed Brokerage · 1379 CR 408, El Campo, TX 77437 · 833-543-LAND · j4lp.com
</div>

<script>
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 40));
document.getElementById('hamburger').addEventListener('click', () => document.getElementById('mobileMenu').classList.add('open'));
document.getElementById('mobileClose').addEventListener('click', () => document.getElementById('mobileMenu').classList.remove('open'));
</script>

</body>
</html>
"""


def build_agent(a):
    title_plain = a["title"].replace("&amp;", "&")
    parts = [p.strip() for p in a["title"].split("·")]
    # If the title starts with "Co-Founder", surface the more descriptive second segment.
    if len(parts) > 1 and parts[0].startswith("Co-Founder"):
        title_short = parts[1]
    else:
        title_short = parts[0]
    # J4 Heritage Group is the only TREC-registered team. All other agents are
    # listed under the brokerage itself (J4 Legacy Properties) to stay compliant.
    team_tag = "J4 Heritage Group" if "Heritage" in a["title"] else "J4 Legacy Properties"
    bio_html = "\n".join(f"        <p>{p}</p>" for p in a["bio_paragraphs"])
    areas_html = "\n".join(f"          <li>{x}</li>" for x in a["areas_served"])
    specialties_html = "\n".join(f"          <li>{x}</li>" for x in a["specialties"])
    designations_html = "\n".join(f"          <li>{x}</li>" for x in a["designations"])

    # Determine TREC sponsoring-broker structure (Sioux + Alexa are NOT under J4LP brokerage)
    if a["slug"] == "sioux-smith":
        # Sioux is an independent Broker Individual; she is also a co-founder of the J4LP company.
        works_for = None  # she IS the broker; no parent brokerage sponsorship
        member_of = {
            "@type": "Organization",
            "name": "J4 Legacy Properties, LLC",
            "url": "https://www.j4lp.com",
        }
    elif a["slug"] == "alexa-emmons":
        # Alexa is sponsored under Sioux Smith's Broker Individual license, not J4LP.
        works_for = {
            "@type": "RealEstateAgent",
            "name": "Sioux Smith, Broker",
            "url": "https://www.j4lp.com/agents/sioux-smith",
            "identifier": "TREC License #650949",
            "telephone": "+1-254-541-6919",
        }
        member_of = None
    else:
        # All J4HG agents (and Cuatro as Designated Broker) are sponsored under J4LP.
        works_for = {
            "@type": "RealEstateAgent",
            "name": "J4 Legacy Properties, LLC",
            "url": "https://www.j4lp.com",
            "telephone": "+1-833-543-5263",
            "address": {
                "@type": "PostalAddress",
                "streetAddress": "1379 CR 408",
                "addressLocality": "El Campo",
                "addressRegion": "TX",
                "postalCode": "77437",
                "addressCountry": "US"
            }
        }
        member_of = None

    schema = {
        "@context": "https://schema.org",
        "@type": "RealEstateAgent",
        "name": a["name"],
        "jobTitle": title_short,
        "telephone": "+1-" + a["phone_display"],
        "email": a["email"],
        "image": f"https://www.j4lp.com/images/team/{a['photo']}",
        "url": f"https://www.j4lp.com/agents/{a['slug']}",
        "identifier": f"TREC License #{a['trec']}",
        "description": a["meta_desc"],
        "areaServed": [{"@type": "AdministrativeArea", "name": x.split("(")[0].strip().replace("&amp;", "&")} for x in a["areas_served"]]
    }
    if works_for:
        schema["worksFor"] = works_for
    if member_of:
        schema["memberOf"] = member_of
    schema_json = json.dumps(schema, indent=2)

    return HTML_TEMPLATE.format(
        meta_desc=a["meta_desc"],
        name=a["name"],
        title_plain=title_plain,
        title_short=title_short,
        slug=a["slug"],
        photo=a["photo"],
        schema_json=schema_json,
        team_tag=team_tag,
        hero_subtitle=a["hero_subtitle"],
        bio_html=bio_html,
        areas_html=areas_html,
        specialties_html=specialties_html,
        designations_html=designations_html,
        first=a["first"],
        phone_tel=a["phone_tel"],
        phone_display=a["phone_display"],
        email=a["email"],
        trec=a["trec"],
        slug_short=a["first"].lower(),
    )


def main():
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "agents")
    os.makedirs(out_dir, exist_ok=True)
    for a in AGENTS:
        path = os.path.join(out_dir, f"{a['slug']}.html")
        with open(path, "w") as f:
            f.write(build_agent(a))
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
