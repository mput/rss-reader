import '@babel/polyfill';
import axios from 'axios';
import validator from 'validator';
import { watch } from 'melanke-watchjs';
import { uniqueId } from 'lodash';
import parseRSS from './parseRSS';


const chenkItput = (url, presentFeeds) => {
  if (!validator.isURL(url)) {
    return 'Not valid URL';
  }
  if (presentFeeds.find(feed => feed === url)) {
    return 'URL already exist';
  }
  return false;
};

const proxyUrl = url => `https://cors-anywhere.herokuapp.com/${url}`;

const fetchFeed = url => axios.get(proxyUrl(url))
  .then(({ data }) => parseRSS(data));

const isNewItem = (maybeNew, oldItems) => !oldItems.find(item => item.guid === maybeNew.guid);

const allFeedsFilterLink = `
  <a class="feed-item list-group-item list-group-item-action active" data-feed-id="all" href="#">
    <div class="d-flex w-100 justify-content-between">
      <h6 class="mb-1">All</h5>
    </div>
  </a>`;

const feedItemTemplate = ({ title, description, link, id }) => `
  <a class="feed-item list-group-item list-group-item-action" data-feed-id="${id}" href="#${link}">
    <div class="d-flex w-100 justify-content-between">
      <h6 class="mb-1">${title}</h5>
    </div>
    <p class="mb-1">${description}</p>
  </a>`;

const itemTemplate = ({ guid, feedId, title, link }) => `
  <li class="list-group-item">
    <button type="button" class="btn btn-outline-info btn-sm mr-2" data-toggle="modal" data-target="#modal" data-guid="${guid}" data-feed-id="${feedId}">Preview</button>
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
  const channelsList = document.querySelector('.feed');
  const arcticlesList = document.querySelector('.articles-list');
  const contentPane = document.querySelector('.content-row');
  const toastContainer = document.querySelector('.toast-container');

  const pushToast = (msg, id) => {
    const messageId = `toast-${id}`;
    const newMessege = toastTemplate(msg, messageId);
    $(toastContainer).append(newMessege);
    $(`#${messageId}`).toast('show');
  };

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
    }, 5000);
  };


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
    pushToast(state.message.text, state.message.counter);
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
    fetchFeed(url)
      .then((feed) => {
        const channel = { ...feed.channel, url, id: uniqueId('feed_') };
        addNewItems(channel, feed.items);
        startUpdating(channel);
        state.channels = [channel, ...state.channels];
        state.urlForm.state = 'empty';
        urlInput.value = '';
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
    const { description, title, link } = state.items
      .find(item => String(item.feedId) === String(feedId) && String(item.guid) === String(guid));
    const modal = $(e.currentTarget);
    modal.find('.modal-title').text(title);
    modal.find('.description').html(description);
    modal.find('.open-link').attr('href', link);
  });
};
