import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';
import { notyfConfig } from './config.js';
const notyf = new Notyf(notyfConfig);
const ipRegex = require('ip-regex');

let dateOfBirthProperty = 'P569';
let dateOfDeathProperty = 'P570';
let placeOfBurialProperty = 'P119';
let statedInProperty = 'P248';
let titleProperty = 'P1476';
let referenceUrlProperty = 'P854';
let dateRetrievedProperty = 'P813';
let slektOgDataElement = 'Q59157408';
let wikidataBaseUrl = 'https://www.wikidata.org';
const calendarModel = 'http://www.wikidata.org/entity/Q1985727';

let url = window.location.href;
if (url.includes('test.wikidata')) {
  dateOfBirthProperty = 'P18';
  dateOfDeathProperty = 'P25';
  placeOfBurialProperty = 'P31';
  statedInProperty = 'P149';
  titleProperty = 'P77107';
  referenceUrlProperty = 'P93';
  dateRetrievedProperty = 'P146';
  slektOgDataElement = 'Q216125';
  wikidataBaseUrl = 'https://test.wikidata.org';
}

let wikidataBaseApiUrl;
let tokenBaseUrl;
let personDescription = '';
let referenceUrl = '';
let csrftoken = '';
let username;

const entityId = url.substring(url.indexOf('/Q') + 1);
let statement;

chrome.runtime.onMessage.addListener((request) => {
  if (
    !request ||
    !request.data ||
    !request.data.personDescription ||
    !request.data.referenceUrl
  ) {
    notyf.error(
      'Kunne ikke lese all nødvendige data. Prøv å kopier på nytt fra Slekt og Data.'
    );
  }
  console.info('username: ', username);
  console.info('ipRegex().test(username): ', ipRegex().test(username));

  if (ipRegex().test(username)) {
    notyf.error(
      'Det ser ikke ut som du er logget inn. Hvis du akkurat har logget inn, last nettleserfanen på nytt, og prøv igjen.'
    );
    chrome.runtime.sendMessage({
      msg: 'reload',
    });
  } else if (username) {
    setUrls();
    addButtons(request);
  } else {
    getUsername((data) => {
      username = data.username;
      setUrls();
      addButtons(request);
    });
  }
});

function getUsername(callback) {
  chrome.runtime.sendMessage(
    {
      msg: 'username',
    },
    callback
  );
}
getUsername((data) => {
  username = data.username;
});

function setUrls() {
  wikidataBaseApiUrl = `${wikidataBaseUrl}/w/api.php`;
  tokenBaseUrl = `${wikidataBaseUrl}/w/api.php?action=query&format=json&meta=tokens&type=csrf&assertuser=${username}`;
}

function addButtons(request) {
  notyf.open({
    type: 'info',
    message: 'Data mottatt fra Slekt og Data.',
  });
  personDescription = request.data.personDescription;
  referenceUrl = request.data.referenceUrl;
  try {
    addButton(dateOfBirthProperty);
    addButton(dateOfDeathProperty);
  } catch {
    notyf.open({
      type: 'info',
      message: 'Kunne ikke finne avsnitt for fødsels- og/eller dødsdato.',
    });
  }
  try {
    addButton(placeOfBurialProperty);
  } catch {}
}

function formatSlektOgDataReference() {
  return {
    snaks: {
      [statedInProperty]: [
        {
          snaktype: 'value',
          property: statedInProperty,
          datavalue: {
            type: 'wikibase-entityid',
            value: {
              id: slektOgDataElement,
            },
          },
        },
      ],
      [titleProperty]: [
        {
          snaktype: 'value',
          property: titleProperty,
          datavalue: {
            value: {
              text: personDescription,
              language: 'nb',
            },
            type: 'monolingualtext',
          },
          datatype: 'monolingualtext',
        },
      ],
      [referenceUrlProperty]: [
        {
          snaktype: 'value',
          property: referenceUrlProperty,
          datavalue: {
            type: 'string',
            value: referenceUrl,
          },
        },
      ],
      [dateRetrievedProperty]: [
        {
          snaktype: 'value',
          property: dateRetrievedProperty,
          datatype: 'time',
          datavalue: {
            type: 'time',
            value: {
              after: 0,
              before: 0,
              calendarmodel: calendarModel,
              precision: 11,
              time: `+${new Date().toISOString().split('T')[0]}T00:00:00Z`,
              timezone: 0,
            },
          },
        },
      ],
    },
    'snaks-order': [
      statedInProperty,
      titleProperty,
      referenceUrlProperty,
      dateRetrievedProperty,
    ],
  };
}

function createFormData(statement) {
  let formData = new FormData();
  formData.append('action', 'wbsetclaim');
  formData.append('format', 'json');
  formData.append('claim', JSON.stringify(statement));
  formData.append(
    'summary',
    'Using [[User:Kjetil r/Gravminnebasen|Slekt og Data Gravminnebasen]] to add reference.'
  );
  formData.append('errorformat', 'plaintext');
  formData.append('uselang', 'en');
  formData.append('token', csrftoken);
  return formData;
}

function updateReferences() {
  if (!statement.references) {
    statement.references = [formatSlektOgDataReference()];
  } else {
    statement.references.push(formatSlektOgDataReference());
  }

  fetch(wikidataBaseApiUrl, {
    method: 'POST',
    credentials: 'same-origin',
    body: createFormData(statement),
  });
}

function getToken() {
  return fetch(tokenBaseUrl)
    .then((response) => response.json())
    .then((data) => {
      if (data.error) {
        notyf.error(
          `Klarte ikke å slå opp brukernavnet. Sikker på at du er logget inn? Feilmelding: ${data.error.info}`
        );
        throw new Error(
          `Error returned when getting csrftoken: ${JSON.stringify(data)}`
        );
      }
      if (
        !data ||
        !data.query ||
        !data.query.tokens ||
        !data.query.tokens.csrftoken
      ) {
        notyf.error(
          'Kunne ikke finne CSFR-token. Gjør en hard reload i nettleseren og prøv igjen.'
        );
        throw new Error(
          `Could not get csrftoken. Error: ${JSON.stringify(data)}`
        );
      }
      csrftoken = data.query.tokens.csrftoken;
    });
}

function getExistingProperty(property) {
  return fetch(
    `${wikidataBaseApiUrl}?action=wbgetclaims&format=json&entity=${entityId}&property=${property}`
  )
    .then((response) => response.json())
    .then((data) => {
      statement = data.claims[property][0];
    });
}

function insertReference(property) {
  if (!personDescription || !referenceUrl) {
    return;
  }
  getExistingProperty(property)
    .then(() => getToken())
    .then(() => updateReferences(property))
    .then(() => {
      notyf.success('Lagrer referanse. Laster siden på nytt…');
    })
    .then(() => setTimeout(() => location.reload(), 1500));
}

function startUpdatingReference(property) {
  if (!username) {
    getUsername((data) => {
      username = data.username;
      setUrls();
      insertReference(property);
    });
  } else {
    insertReference(property);
  }
}

function addButton(section) {
  const customSpan = document.createElement('span');
  customSpan.style.marginLeft = '20px';
  const customLink = document.createElement('a');
  customLink.addEventListener('click', () => startUpdatingReference(section));

  const customContent = document.createTextNode('gravminne-ref');
  customSpan.appendChild(customLink);
  customLink.appendChild(customContent);

  const parentNode = document
    .getElementById(section)
    .getElementsByClassName('wikibase-toolbar-button-add')[0].parentNode;
  parentNode.appendChild(customSpan);
}
