/**
 * The documented record.
 *
 * EDITORIAL RULE — read before adding an entry:
 *   Every entry carries a `tier` and at least one `sources` link.
 *     'documented'  primary sources, peer-reviewed research, declassified records, public law
 *     'contested'   a real open question with official government activity behind it
 *     'allegation'  a claim from a book or reporting that has not been substantiated
 *
 *   Do NOT promote an entry to 'documented' because it is persuasive or widely repeated.
 *   An allegation rendered as fact is the fastest way to get this whole project dismissed,
 *   and the surrounding claims dismissed along with it.
 */

export const TIMELINE = [
  {
    when: '~3300 BCE',
    sort: -3300,
    tier: 'documented',
    title: 'The oldest known human case is 5,300 years old',
    body: `Researchers sequencing the genome of Ötzi — the naturally mummified man found in the
      Ötztal Alps — recovered genetic material matching <em>Borrelia burgdorferi</em>, the bacterium
      that causes Lyme disease. It is the earliest known evidence of the infection in a human being,
      and it places the organism in Europe more than five thousand years before any laboratory
      existed.`,
    sources: [
      { label: 'Keller et al., Nature Communications (2012)', url: 'https://www.nature.com/articles/ncomms1701' },
    ],
  },
  {
    when: '1883',
    sort: 1883,
    tier: 'documented',
    title: 'German physicians describe the skin disease',
    body: `Alfred Buchwald describes acrodermatitis chronica atrophicans, a chronic skin condition
      later understood to be a late manifestation of Lyme borreliosis.`,
    sources: [{ label: 'History of Lyme borreliosis, CDC', url: 'https://www.cdc.gov/lyme/about/index.html' }],
  },
  {
    when: '1909',
    sort: 1909,
    tier: 'documented',
    title: 'The bullseye rash is linked to a tick bite',
    body: `Swedish dermatologist Arvid Afzelius presents a case of an expanding ring-shaped rash
      following the bite of a sheep tick — the lesion now called erythema migrans, the most
      recognizable sign of early Lyme disease.`,
    sources: [{ label: 'Afzelius, Arch Dermatol Syph (1921)', url: 'https://pubmed.ncbi.nlm.nih.gov/?term=afzelius+erythema+migrans' }],
  },
  {
    when: '1945',
    sort: 1945,
    tier: 'documented',
    key: true,
    title: 'Infected ticks were already on Long Island — nine years before Plum Island opened',
    body: `Yale researchers used PCR to test 136 archival tick specimens preserved in the Museum of
      Comparative Zoology and the Smithsonian. Thirteen ticks collected at <strong>Montauk Point and
      Hither Hills, Long Island in the 1940s</strong> carried DNA matching modern
      <em>B. burgdorferi</em> isolates. This is the single most important date on this page: it puts
      the bacterium in the exact region where Lyme disease would later be recognized, three decades
      before the Connecticut cluster and nine years before the Plum Island facility opened.`,
    sources: [
      { label: 'Persing et al., Science, 21 Sept 1990', url: 'https://www.science.org/doi/10.1126/science.2402635' },
      { label: 'PubMed record', url: 'https://pubmed.ncbi.nlm.nih.gov/2402635/' },
    ],
  },
  {
    when: '1954–1956',
    sort: 1954.1,
    tier: 'documented',
    key: true,
    title: 'The US Army ran a real entomological warfare program',
    body: `This part is not disputed and not a theory. The US Army Chemical Corps conducted a series
      of declassified field trials using insects as delivery vehicles for biological agents:
      <strong>Operation Big Itch</strong> (1954, fleas at Dugway Proving Ground),
      <strong>Operation Big Buzz</strong> (1955, roughly 300,000 mosquitoes released in Georgia), and
      <strong>Operation May Day</strong> (1956, mosquitoes released in Savannah). Arthropods as
      vectors were an explicit, funded American research line during exactly the period Congress is
      now asking about.`,
    sources: [
      { label: 'US Army Activity in the US Biological Warfare Programs (declassified, 1977)', url: 'https://www.esd.whs.mil/Portals/54/Documents/FOID/Reading%20Room/Other/1035.pdf' },
      { label: 'Chemical and Biological Warfare and Drug Testing, DOE OpenNet', url: 'https://www.osti.gov/opennet/servlets/purl/16008796.pdf' },
    ],
  },
  {
    when: '1954',
    sort: 1954.2,
    tier: 'documented',
    title: 'Plum Island Animal Disease Center opens off Long Island',
    body: `The federal animal disease laboratory opens on Plum Island, roughly ten miles across the
      water from Lyme, Connecticut. Its declassified mission was foreign animal disease research,
      including work on animal pathogens with biological warfare relevance. Its proximity to the
      town that gave the disease its name is the origin of most of the speculation on this page —
      and proximity, on its own, is not evidence.`,
    sources: [
      { label: 'GAO: Plum Island biosafety (GAO-03-847)', url: 'https://www.gao.gov/products/gao-03-847' },
      { label: 'USDA Plum Island history', url: 'https://www.ars.usda.gov/northeast-area/orient-point-ny/plum-island-animal-disease-center/' },
    ],
  },
  {
    when: '1969',
    sort: 1969,
    tier: 'documented',
    title: 'Nixon ends the offensive biological weapons program',
    body: `President Nixon renounces offensive biological weapons and orders existing stockpiles
      destroyed. Research records from the preceding two decades are the records now at issue.`,
    sources: [{ label: 'Nixon statement, 25 Nov 1969', url: 'https://www.presidency.ucsb.edu/documents/statement-chemical-and-biological-defense-policies-and-programs' }],
  },
  {
    when: '1975',
    sort: 1975,
    tier: 'documented',
    key: true,
    title: 'Two mothers in Connecticut refuse to be brushed off',
    body: `Polly Murray and Judith Mensch independently report an implausible cluster of juvenile
      arthritis among children in Lyme, Old Lyme and East Haddam to the Connecticut State Department
      of Health. Their persistence — not a government surveillance system — is what triggered the
      investigation. Allen Steere at Yale takes the case and characterizes what he calls
      "Lyme arthritis." <strong>Patients found this disease. Institutions followed.</strong>`,
    sources: [
      { label: 'Steere et al., Arthritis & Rheumatism (1977)', url: 'https://pubmed.ncbi.nlm.nih.gov/836338/' },
      { label: 'CDC: history of Lyme disease', url: 'https://www.cdc.gov/lyme/about/index.html' },
    ],
  },
  {
    when: '1981',
    sort: 1981,
    tier: 'documented',
    title: 'Willy Burgdorfer identifies the bacterium',
    body: `Willy Burgdorfer, working at NIH's Rocky Mountain Laboratories in Montana, finds
      spirochetes in the midguts of <em>Ixodes</em> ticks and links them to the Connecticut illness.
      The organism is named <em>Borrelia burgdorferi</em> after him. Burgdorfer's earlier career
      included tick-borne pathogen work connected to the US biological warfare program — a fact that
      is documented, and that later reporting would build on.`,
    sources: [
      { label: 'Burgdorfer et al., Science (1982)', url: 'https://www.science.org/doi/10.1126/science.7043737' },
      { label: 'NIH Rocky Mountain Laboratories', url: 'https://www.niaid.nih.gov/about/rocky-mountain-laboratories' },
    ],
  },
  {
    when: '1998–2002',
    sort: 1998,
    tier: 'documented',
    title: 'A Lyme vaccine reaches market, then disappears',
    body: `LYMErix is approved by FDA in 1998 and withdrawn by the manufacturer in 2002 amid
      reports of adverse events, litigation and collapsing sales. The FDA's review did not establish
      that the vaccine caused the reported harms. Either way, the United States has had no human
      Lyme vaccine on the market for more than twenty years while case counts climbed.`,
    sources: [
      { label: 'Nigrovic & Thompson, Epidemiol Infect (2007)', url: 'https://pubmed.ncbi.nlm.nih.gov/16893489/' },
    ],
  },
  {
    when: '2004',
    sort: 2004,
    tier: 'allegation',
    title: 'Lab 257 alleges a Plum Island origin',
    body: `Michael Carroll's book <em>Lab 257</em> argues that Plum Island is the source of Lyme
      disease and connects the facility to Erich Traub, a Nazi-era virologist brought to the United
      States under Operation Paperclip. <strong>Operation Paperclip is documented history and
      Traub's recruitment is real. The Plum Island–to–Lyme link is not established</strong>, and the
      1945 Long Island tick evidence above is difficult to reconcile with it. Presented here as the
      book's claim, because you will encounter it and should know exactly what tier it sits in.`,
    sources: [
      { label: 'Lab 257 (publisher listing)', url: 'https://www.harpercollins.com/products/lab-257-michael-christopher-carroll' },
      { label: 'American Lyme Disease Foundation response', url: 'https://aldf.com/did-lyme-disease-originate-in-the-eastern-u-s-from-borrelia-burgdorferi-infected-ticks-that-escaped-from-a-laboratory-at-the-plum-island-animal-disease-center-where-scientists-were-conducting-top-sec/' },
    ],
  },
  {
    when: '2019',
    sort: 2019.1,
    tier: 'allegation',
    title: 'Bitten reports Burgdorfer interviews',
    body: `Science journalist Kris Newby's <em>Bitten</em> reports on interviews with Willy
      Burgdorfer late in his life and argues that his bioweapons-adjacent tick research overlapped
      with pathogens later found in Lyme patients. The book is serious reporting and it raised
      questions that Congress subsequently acted on. Its central claim remains unsubstantiated and
      is presented here as an allegation.`,
    sources: [{ label: 'Bitten (publisher listing)', url: 'https://www.harpercollins.com/products/bitten-kris-newby' }],
  },
  {
    when: '2019–2021',
    sort: 2019.2,
    tier: 'contested',
    key: true,
    title: 'Congress orders the Pentagon to answer the question',
    body: `Rep. Chris Smith (NJ) attaches an amendment to the National Defense Authorization Act
      directing a federal review of <strong>whether the Department of Defense experimented with
      ticks and other insects as biological weapons between 1950 and 1975, and whether any were
      released outside a laboratory</strong>, by accident or by design. The House passes versions of
      it in 2019, 2020 and 2021. This is the live thread. A sitting member of Congress got the
      House to demand these records, repeatedly, and the full findings are still not public.`,
    sources: [
      { label: "Rep. Chris Smith, House passage announcement", url: 'https://chrissmith.house.gov/news/documentsingle.aspx?DocumentID=409662' },
      { label: 'CBS News coverage', url: 'https://www.cbsnews.com/news/house-passes-amendment-ordering-pentagon-to-investigate-whether-ticks-were-weaponized/' },
      { label: 'Smith floor statement (2021, PDF)', url: 'https://chrissmith.house.gov/uploadedfiles/2021-09-22_americans_deserve_the_truth__did_dod_weaponize_ticks_with_lyme_disease.pdf' },
    ],
  },
  {
    when: '2022',
    sort: 2022,
    tier: 'documented',
    title: 'CDC revises the surveillance case definition',
    body: `CDC adopts a revised Lyme disease surveillance case definition. Reported cases jump about
      69% — from 24,611 in 2021 to 62,551 in 2022. CDC attributes the increase primarily to changed
      surveillance methods in high-incidence jurisdictions, <strong>not</strong> to a real change in
      disease risk. Anyone who shows you the post-2022 jump as proof of an outbreak is misreading
      the chart, and this site will not do that.`,
    sources: [{ label: 'MMWR 73(6), Feb 2024', url: 'https://www.cdc.gov/mmwr/volumes/73/wr/mm7306a1.htm' }],
  },
  {
    when: 'FY2025',
    sort: 2025,
    tier: 'contested',
    key: true,
    title: 'The question moves to the GAO — and stays open',
    body: `Congress directs the Government Accountability Office to investigate the Cold War-era DoD
      biological weapons program and whether ticks were used as hosts or delivery mechanisms for
      biological warfare agents. <strong>As of this writing the complete findings have not been
      released to the public.</strong> That is the specific, narrow, winnable thing this petition
      asks for: publish the record.`,
    sources: [
      { label: 'LymeDisease.org coverage of the amendments', url: 'https://www.lymedisease.org/ticks-weaponized-amendment/' },
      { label: 'Snopes fact-check of the claim', url: 'https://www.snopes.com/fact-check/weaponized-ticks/' },
    ],
  },
];

/**
 * The counter-evidence box. This appears high on the page, not buried at the bottom.
 * Citing your own critics is what earns the reader's trust for everything else.
 */
export const COUNTER_EVIDENCE = {
  head: 'What the evidence says against a laboratory origin',
  body: `<p>The strongest argument against the idea that the US government created Lyme disease is
    chronological, and this site takes it seriously rather than ignoring it.</p>
    <p><em>Borrelia burgdorferi</em> DNA has been recovered from a <strong>5,300-year-old Alpine
    mummy</strong> and from <strong>ticks collected on Long Island in 1945</strong> — nine years
    before the Plum Island facility opened and thirty years before the Connecticut cluster. The
    bacterium is ancient, and it was already established in the northeastern United States before
    the Cold War programs began. A pathogen that old was not invented in a laboratory in the 1950s.</p>
    <p>That finding closes one question. It does not close the other one, and the two are constantly
    confused: <strong>what did the Department of Defense's entomological warfare program actually do
    with ticks between 1950 and 1975, and was anything released?</strong> The Army's insect-vector
    trials are declassified fact. Congress has asked for the full record three times. The record is
    still not public.</p>
    <p class="muted">Read the arguments against the origin claim directly — we would rather you
    arrive at the narrow question honestly than accept the broad one uncritically.</p>`,
  links: [
    { label: 'American Lyme Disease Foundation: the Plum Island claim', url: 'https://aldf.com/did-lyme-disease-originate-in-the-eastern-u-s-from-borrelia-burgdorferi-infected-ticks-that-escaped-from-a-laboratory-at-the-plum-island-animal-disease-center-where-scientists-were-conducting-top-sec/' },
    { label: 'Snopes: Was DOD ordered to disclose if it developed weaponized ticks?', url: 'https://www.snopes.com/fact-check/weaponized-ticks/' },
  ],
};

/** What the petition actually demands. Specific asks beat vague support. */
export const DEMANDS = [
  {
    id: 'declassify',
    title: 'Publish the tick research record, 1950–1975',
    body: `Release the complete Department of Defense and GAO findings on whether ticks and other
      arthropods were studied or used as biological weapon vectors, including whether any were
      released outside a laboratory. Congress has ordered this review more than once. Publish it.`,
  },
  {
    id: 'research',
    title: 'Fund an independent review of chronic Lyme and PTLDS',
    body: `Hundreds of thousands of Americans report symptoms that persist after the standard course
      of treatment. Fund a properly powered, independent scientific review of persistent illness
      after Lyme disease — including diagnostics, biomarkers and treatment — outside the bodies that
      wrote the contested guidelines.`,
  },
  {
    id: 'diagnostics',
    title: 'Fix the diagnostic and coverage standards',
    body: `Current two-tier serologic testing misses a substantial share of early infections. Direct
      CDC, NIH and FDA to prioritize validated direct-detection diagnostics, and end insurance
      denials that rest on a testing standard the agencies themselves acknowledge is insensitive
      early in the disease.`,
  },
  {
    id: 'compensation',
    title: 'Create a pathway for people already disabled',
    body: `Establish a route to evaluation and compensation for Americans with long-term disability
      following Lyme disease, modeled on existing federal compensation programs, so that people who
      are too sick to work are not left to litigate individually against the federal government.`,
  },
];
