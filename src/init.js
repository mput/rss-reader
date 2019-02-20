import '@babel/polyfill';
import validator from 'validator';
import { watch, callWatchers } from 'melanke-watchjs';
import axios from 'axios';

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

const allFeedLink = `
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

const articleItemTemplate = (item, feedId) => `
  <li class="list-group-item">
    <button type="button" class="btn btn-outline-info btn-sm mr-2" data-toggle="modal" data-target="#modal" data-item-id="${item.id}" data-feed-id="${feedId}">Preview</button>
    <a href="${item.link}">${item.title}</a>
  </li> `;

const buildArtticlesForFeed = feed => feed.items.map(item => articleItemTemplate(item, feed.id)).join('\n');

export default () => {
  const state = {
    feeds: [],
    feedToShow: 'all', // feedId
    urlForm: {
      state: 'empty', // valid, invalid, waiting
      errorMsg: '',
      successMsg: '',
    },
    alerts: {
      success: '',
      danger: '',
    },
  };

  const formElement = document.getElementById('add-url');
  const urlInput = formElement.querySelector('[name="rss-url"]');
  const invalidFeedback = formElement.querySelector('.invalid-feedback');
  const submitBtn = formElement.querySelector('button[type="submit"]');
  const submitBtnSpinner = submitBtn.querySelector('.spinner-border');

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
        invalidFeedback.textContent = state.urlForm.errorMsg;
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


  const feedsList = document.querySelector('.feed');
  const arcticlesList = document.querySelector('.articles-list');
  const contentPane = document.querySelector('.content-row');


  watch(state, 'feeds', () => {
    if (state.feeds.length > 0) {
      contentPane.classList.remove('d-none');
    }
    const feeds = state.feeds.map(feed => feedItemTemplate(feed));
    const feedsHTML = [allFeedLink, ...feeds].join('\n');
    feedsList.innerHTML = feedsHTML;
    callWatchers(state, 'feedToShow');
  });

  watch(state, 'feedToShow', () => {
    const feeds = state.feedToShow === 'all' ? state.feeds : state.feeds.filter(({ id }) => id === state.feedToShow);
    const itmesHTML = feeds.map(feed => buildArtticlesForFeed(feed)).join('\n');
    arcticlesList.innerHTML = itmesHTML;

    feedsList.querySelector('.active').classList.remove('active');
    feedsList.querySelector(`[data-feed-id=${state.feedToShow}]`).classList.add('active');
  });

  urlInput.addEventListener('input', (e) => {
    const url = e.target.value;
    if (url === '') {
      state.urlForm.state = 'empty';
      return;
    }
    const error = chenkItput(url, state.feeds.map(feed => feed.url));
    if (error) {
      state.urlForm.state = 'invalid';
      state.urlForm.errorMsg = error;
    } else {
      state.urlForm.state = 'valid';
    }
  });

  formElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    state.urlForm.state = 'waiting';

    const url = urlInput.value;
    try {
      const { data } = await axios.get(proxyUrl(url));
      const feed = parseRSS(data);
      state.feeds = [feed, ...state.feeds];
      state.urlForm.state = 'empty';
      urlInput.value = '';
    } catch (error) {
      state.urlForm.state = 'invalid';
      state.urlForm.errorMsg = 'Something wrong with this feed';
    }
  });

  feedsList.addEventListener('click', (event) => {
    event.preventDefault();
    const link = event.target.closest('.feed-item');
    if (!link) {
      return;
    }
    const id = link.dataset.feedId;
    state.feedToShow = id;
  });

  $('#modal').on('show.bs.modal', (event) => {
    const button = $(event.relatedTarget);
    const feedId = button.data('feed-id');
    const itemId = button.data('item-id');
    const feed = state.feeds.find(({ id }) => id === feedId);
    console.log(feed);
    const { description, title, link } = feed.items.find(({ id }) => id === itemId);

    const modal = $(event.currentTarget);
    console.log(modal);

    modal.find('.modal-title').text(title);
    modal.find('.description').html(description);
    modal.find('.open-link').attr('href', link);
  });
};
