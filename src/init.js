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
      state: 'empty', // valid, invalid, waiting
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

  const feedTemplate = (title, description, link) => `
  <a class="feed-item list-group-item list-group-item-action" href="${link}">
    <div class="d-flex w-100 justify-content-between">
      <h6 class="mb-1">${title}</h5>
    </div>
    <p class="mb-1">${description}</p>
  </a>`;

  const articleTemplate = (title, link, description) => `
  <li class="list-group-item">
    <button type="button" class="btn btn-outline-info btn-sm mr-2" data-toggle="modal" data-target="#modal" data-title="${title}" data-description='${description}' data-href="${link}">Preview</button>
    <a href="${link}">${title}</a>
  </li> `;

  watch(state, 'feeds', () => {
    if (state.feeds.length > 0) {
      contentPane.classList.remove('d-none');
    }
    const feeds = state.feeds
      .map(({ channel: { title, description, link } }) => feedTemplate(title, description, link))
      .join('\n');
    feedsList.innerHTML = feeds;
    const articles = _.flatten(state.feeds.map(({ items }) => items))
      .map(({ title, link, description }) => articleTemplate(title, link, description))
      .join('\n');
    arcticlesList.innerHTML = articles;
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

    const feedUrl = urlInput.value;
    try {
      const feed = new RssFeed(feedUrl);
      await feed.update();
      state.feeds = [...state.feeds, feed];
      state.urlForm.state = 'empty';
      urlInput.value = '';
    } catch (error) {
      state.urlForm.state = 'invalid';
      state.urlForm.errorMsg = 'Something wrong with this feed';
    }
  });

  $('#modal').on('show.bs.modal', (event) => {
    const button = $(event.relatedTarget);
    const title = button.data('title');
    const description = button.data('description');
    const href = button.data('href');
    const modal = $(this);
    modal.find('.modal-title').text(title);
    modal.find('.description').text(description);
    modal.find('.open-link').attr('href', href);
  });
};
