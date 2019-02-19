import '@babel/polyfill';
import validator from 'validator';
import { watch } from 'melanke-watchjs';
import _ from 'lodash';

import RssFeed from './RssFeed';

const chenkItput = (url, presentFeeds) => {
  if (!validator.isURL(url)) {
    return 'Not valid URL';
  }
  if (presentFeeds.find(feed => feed === url)) {
    return 'URL already exist';
  }
  return false;
};

export default () => {
  const state = {
    feeds: [],
    urlForm: {
      validness: 'unknown', // valid, invalid
      disabled: false,
      isWaiting: false,
      errorMsg: '',
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
    submitBtn.disabled = state.urlForm.disabled;
    invalidFeedback.textContent = state.urlForm.errorMsg;

    if (state.urlForm.validness === 'unknown') {
      urlInput.classList.remove('is-invalid');
      urlInput.classList.remove('is-valid');
    } else if (state.urlForm.validness === 'invalid') {
      urlInput.classList.remove('is-valid');
      urlInput.classList.add('is-invalid');
    } else if (state.urlForm.validness === 'valid') {
      urlInput.classList.add('is-valid');
      urlInput.classList.remove('is-invalid');
    }

    if (state.urlForm.isWaiting) {
      submitBtnSpinner.classList.remove('d-none');
    } else {
      submitBtnSpinner.classList.add('d-none');
    }
  });


  const articlesCol = document.querySelector('.articles-col')
  const feedsList = document.querySelector('.feed');
  const feedTemplate = (title, description, link) => `
  <a class="feed-item list-group-item list-group-item-action" href="${link}">
    <div class="d-flex w-100 justify-content-between">
      <h5 class="mb-1">${title}</h5>
    </div>
    <p class="mb-1">${description}</p>
  </a>`;
  const arcticlesList = document.querySelector('.articles-list');
  const articleTemplate = (title, link) => `
  <li class="list-group-item">
    <a href="${link}">${title}</a>
  </li> `;

  watch(state, 'feeds', () => {
    if (state.feeds.length > 0) {
      articlesCol.classList.remove('d-none');
    }
    const feeds = state.feeds
      .map(({ channel: { title, description, link } }) => feedTemplate(title, description, link))
      .join('\n');
    feedsList.innerHTML = feeds;
    const articles = _.flatten(state.feeds.map(({ items }) => items))
      .map(({ title, link }) => articleTemplate(title, link))
      .join('\n');
    arcticlesList.innerHTML = articles;
  });

  urlInput.addEventListener('input', (e) => {
    const url = e.target.value;
    if (url === '') {
      state.urlForm.disabled = true;
      state.urlForm.validness = 'unknown';
      state.urlForm.errorMsg = '';
      return;
    }
    const error = chenkItput(url, state.feeds.map(feed => feed.url));
    if (error) {
      state.urlForm.disabled = true;
      state.urlForm.validness = 'invalid';
      state.urlForm.errorMsg = error;
    } else {
      state.urlForm.disabled = false;
      state.urlForm.validness = 'valid';
      state.urlForm.errorMsg = '';
    }
  });

  formElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    state.urlForm.disabled = true;
    state.urlForm.isWaiting = true;

    const feedUrl = urlInput.value;
    try {
      const feed = new RssFeed(feedUrl);
      await feed.update();
      state.feeds = [...state.feeds, feed];
      state.urlForm.validness = 'unknown';
      urlInput.value = '';
    } catch (error) {
      state.urlForm.validness = 'invalid';
      state.urlForm.errorMsg = 'Something wrong with this feed';
    }

    state.urlForm.disabled = false;
    state.urlForm.isWaiting = false;
  });
};
