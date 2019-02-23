import '@babel/polyfill';
import axios from 'axios';
import validator from 'validator';
import { watch } from 'melanke-watchjs';
import { uniqueId, sample } from 'lodash';
import parseRSS from './parseRSS';

const updateInterval = 8000;
const CORSproxys = ['https://cors-anywhere.herokuapp.com/', 'https://cors.io/?'];
const proxyUrl = url => `${sample(CORSproxys)}${url}`;

const fetchFeed = url => axios.get(proxyUrl(url))
  .then(({ data }) => parseRSS(data));

const isNewItem = (maybeNew, oldItems) => !oldItems.find(item => item.guid === maybeNew.guid);

const chenkItput = (url, presentFeeds) => {
  if (!validator.isURL(url)) {
    return 'Not valid URL';
  }
  if (presentFeeds.find(feed => feed === url)) {
    return 'URL already exist';
  }
  return false;
};

const allFeedsFilterLink = `
  <a class="feed-item list-group-item list-group-item-action active" data-feed-id="all" href="#">
    <p class="mb-1"><strong>All chanels</strong></p>
  </a>`;

const feedItemTemplate = ({ title, description, link, id }) => `
  <a class="feed-item list-group-item list-group-item-action pt-3 pb-2" data-feed-id="${id}" href="#${link}">
    <p class="mb-1"><strong>${title}</strong></p>
    <p class="mb-1">${description}</p>
  </a>`;

const itemTemplate = ({ guid, feedId, title, link }) => `
  <li class="list-group-item d-flex">
    <button type="button" class="btn btn-outline-primary btn-sm mr-2 align-self-center" data-toggle="modal" data-target="#modal" data-guid="${guid}" data-feed-id="${feedId}">Preview</button>
    <a href="${link}">${title}</a>
  </li> `;

const toastTemplate = (msg, id, delay = 8000) => `
  <div id=${id} class="toast" role="alert" aria-live="assertive" aria-atomic="true" data-delay="${delay}">
    <div class="toast-header">
      <strong class="mr-auto">RSS Reader</strong>
      <small class="text-muted">Update</small>
      <button type="button" class="ml-2 mb-1 close" data-dismiss="toast" aria-label="Close">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
    <div class="toast-body">
      ${msg}
    </div>
  </div>`;

export default () => {
  const state = {
    channels: [],
    items: [],
    chanelsFilter: 'all', // feedId
    urlForm: {
      state: 'empty', // valid, invalid, waiting
      message: '',
    },
    message: {
      counter: 0,
      text: '',
    },
  };

  const formElement = document.getElementById('add-url');
  const urlInput = formElement.querySelector('[name="rss-url"]');
  const invalidFeedback = formElement.querySelector('.invalid-feedback');
  const submitBtn = formElement.querySelector('button[type="submit"]');
  const submitBtnSpinner = submitBtn.querySelector('.spinner-border');

  const contentPane = document.querySelector('.content-row');
  const channelsList = document.querySelector('.channels');
  const arcticlesList = document.querySelector('.articles-list');
  const toastContainer = document.querySelector('.toast-container');

  const pushToast = (msg, id, delay) => {
    const messageId = `toast-${id}`;
    const newMessege = toastTemplate(msg, messageId, delay);
    $(toastContainer).append(newMessege);
    const toastElm = $(`#${messageId}`);
    toastElm.toast('show');
    setTimeout(() => toastElm.remove(), delay + 100);
  };

  const findItem = (feedId, guid) => state.items
    .find(item => String(item.feedId) === String(feedId)
      && String(item.guid) === String(guid));

  const addNewItems = (feed, items) => {
    const existingItems = state.items.filter(article => article.feedId === feed.id);
    const newArticles = items
      .filter(article => isNewItem(article, existingItems))
      .map(item => ({ ...item, feedId: feed.id }));
    if (newArticles.length > 0) {
      state.message = {
        counter: state.message.counter + 1,
        text: `Fetched ${newArticles.length} new items from <b>${feed.title}</b>`,
      };
      state.items = [...newArticles, ...state.items];
    }
  };

  const startUpdating = (feed) => {
    setTimeout(() => {
      fetchFeed(feed.url)
        .then(({ items }) => addNewItems(feed, items))
        .finally(() => {
          startUpdating(feed);
        });
    }, updateInterval);
  };

  const addNewFeed = url => fetchFeed(url)
    .then((feed) => {
      const channel = { ...feed.channel, url, id: uniqueId('feed_') };
      state.channels = [channel, ...state.channels];
      addNewItems(channel, feed.items);
      startUpdating(channel);
    });


  watch(state, 'urlForm', () => {
    invalidFeedback.textContent = '';
    urlInput.classList.remove('is-invalid');
    urlInput.classList.remove('is-valid');
    submitBtnSpinner.classList.remove('d-none');
    urlInput.disabled = false;
    submitBtn.disabled = false;

    switch (state.urlForm.state) {
      case 'empty':
        submitBtnSpinner.classList.add('d-none');
        submitBtn.disabled = true;
        urlInput.value = '';
        break;
      case 'invalid':
        urlInput.classList.add('is-invalid');
        submitBtnSpinner.classList.add('d-none');
        submitBtn.disabled = true;
        invalidFeedback.textContent = state.urlForm.message;
        break;
      case 'valid':
        urlInput.classList.add('is-valid');
        submitBtnSpinner.classList.add('d-none');
        break;
      case 'waiting':
        urlInput.disabled = true;
        submitBtn.disabled = true;
        break;
      default:
    }
  });

  watch(state, 'channels', () => {
    if (state.channels.length > 0) {
      contentPane.classList.remove('d-none');
    }
    const feeds = state.channels.map(feed => feedItemTemplate(feed));
    const feedsHTML = [allFeedsFilterLink, ...feeds].join('\n');
    channelsList.innerHTML = feedsHTML;
  });

  watch(state, ['items', 'chanelsFilter'], () => {
    const itemsToShow = state.chanelsFilter === 'all' ? state.items : state.items.filter(({ feedId }) => feedId === state.chanelsFilter);
    const itmesHTML = itemsToShow.map(item => itemTemplate(item)).join('\n');
    arcticlesList.innerHTML = itmesHTML;
    channelsList.querySelector('.active').classList.remove('active');
    channelsList.querySelector(`[data-feed-id=${state.chanelsFilter}]`).classList.add('active');
  });

  watch(state, 'message', () => {
    pushToast(state.message.text, state.message.counter, 4000);
  });

  urlInput.addEventListener('input', (e) => {
    const url = e.target.value;
    if (url === '') {
      state.urlForm.state = 'empty';
      return;
    }
    const error = chenkItput(url, state.channels.map(feed => feed.url));
    if (error) {
      state.urlForm.state = 'invalid';
      state.urlForm.message = error;
    } else {
      state.urlForm.state = 'valid';
    }
  });

  formElement.addEventListener('submit', (e) => {
    e.preventDefault();
    state.urlForm.state = 'waiting';
    const url = urlInput.value;
    addNewFeed(url)
      .then(() => {
        state.urlForm.state = 'empty';
      })
      .catch(() => {
        state.urlForm.state = 'invalid';
        state.urlForm.message = 'Something wrong with this feed';
      });
  });

  channelsList.addEventListener('click', (e) => {
    e.preventDefault();
    const link = e.target.closest('.feed-item');
    if (!link) {
      return;
    }
    const id = link.dataset.feedId;
    state.chanelsFilter = id;
  });

  $('#modal').on('show.bs.modal', (e) => {
    const button = $(e.relatedTarget);
    const feedId = button.data('feed-id');
    const guid = button.data('guid');
    const { description, title, link } = findItem(feedId, guid);
    const modal = $(e.currentTarget);
    modal.find('.modal-title').text(title);
    modal.find('.description').html(description);
    modal.find('.open-link').attr('href', link);
  });

  const startWithFeeds = [
    'http://lorem-rss.herokuapp.com/feed?unit=second&interval=10',
    'https://habr.com/ru/rss/best/weekly/?fl=ru',
  ];
  Promise.all(startWithFeeds.map(url => addNewFeed(url).catch(console.log)));
};
