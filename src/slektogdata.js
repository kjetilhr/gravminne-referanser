import { Notyf } from 'notyf';
import 'notyf/notyf.min.css';
import { notyfConfig } from './config.js';
const notyf = new Notyf(notyfConfig);

const personId = window.location.href.split('/grav/').pop();
const personApiUrl = `https://gravminner.slektogdata.no/grave/${personId}`;
const referenceUrl = window.location.href;
const jwtUrl = 'https://admin.slektogdata.no/nb/gravminner/jwt';

let bearerToken = '';
let personDescription = '';

function getBearerToken() {
  return fetch(jwtUrl)
    .then((response) => response.json())
    .then((data) => {
      bearerToken = 'Bearer ' + data;
    });
}

function getGraveData() {
  return fetch(personApiUrl, {
    headers: new Headers({
      Authorization: bearerToken,
      'Content-Type': 'application/json',
    }),
  }).then((response) => response.json());
}

function loadData() {
  getBearerToken()
    .then(getGraveData)
    .then((data) => {
      personDescription = 'M' + data.sourceReference.split(', m').pop();
    })
    .then(() => {
      chrome.runtime.sendMessage(
        {
          msg: 'gravminne',
          data: {
            personDescription,
            referenceUrl,
          },
        },
        () =>
          notyf.success(
            'Referansen er kopiert og kan nå limes inn på Wikidata.'
          )
      );
    })
    .catch((error) => {
      console.error('Could not get description. Error: ', error);
      notyf.error(
        'Kunne ikke kopiere referansen. Last fanen på nytt og prøv igjen. Hvis det ikke hjelper, se Extensions-loggen for detaljer.'
      );
    });
}

function addCustomButton() {
  const customButton = document.createElement('a');
  const customContent = document.createTextNode('Wikidata');
  customButton.appendChild(customContent);
  customButton.classList.add('button-back');
  customButton.classList.add('float-right');
  customButton.style.cursor = 'pointer';
  customButton.addEventListener('click', loadData);

  const parentNode =
    document.getElementsByClassName('button-change')[0].parentNode;
  parentNode.appendChild(customButton);
}

setTimeout(() => addCustomButton(), 500);
