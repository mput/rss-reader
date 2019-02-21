import '@babel/polyfill';
import axios from 'axios';
import validator from 'validator';
import { watch } from 'melanke-watchjs';
import { uniqueId } from 'lodash';

import { parseChannel, parseItems } from './rssParser';


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

const isNewItem = (maybeNew, oldItems) => !oldItems.find(item => item.guid === maybeNew.guid);

const allFeedsFilterLink = `
<a class="feed-item list-group-item list-group-item-action list-group-item-light active" data-feed-id="all" href="#">
  <div class="d-flex w-100 justify-content-between">
    <h6 class="mb-1">All</h5>
  </div>
</a>`;

const feedItemTemplate = ({ title, description, link, id }) => `
<a class="feed-item list-group-item list-group-item-action list-group-item-light" data-feed-id="${id}" href="#${link}">
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

export default () => {
  const state = {
    channels: [],
    items: [],
    chanelsFilter: 'all', // feedId
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
  const channelsList = document.querySelector('.feed');
  const arcticlesList = document.querySelector('.articles-list');
  const contentPane = document.querySelector('.content-row');

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

  urlInput.addEventListener('input', (e) => {
    const url = e.target.value;
    if (url === '') {
      state.urlForm.state = 'empty';
      return;
    }
    const error = chenkItput(url, state.channels.map(feed => feed.url));
    if (error) {
      state.urlForm.state = 'invalid';
      state.urlForm.errorMsg = error;
    } else {
      state.urlForm.state = 'valid';
    }
  });

  const fetchRawRss = async (url) => {
    const { data } = await axios.get(proxyUrl(url));
    console.log(`Loading feed from ${url}`);
    return data;
  };


  const addNewItems = async (feed, rss) => {
    const rawRss = rss || await fetchRawRss(feed.url);
    const items = parseItems(rawRss);
    const existingItems = state.items.filter(article => article.feedId === feed.id);
    const newArticles = items
      .filter(article => isNewItem(article, existingItems))
      .map(item => ({ ...item, feedId: feed.id }));
    if (newArticles.length > 0) {
      console.log(`Fetched ${newArticles.length} new items from ${feed.title}`);
      state.items = [...newArticles, ...state.items];
    }
  };

  const startUpdating = (channel) => {
    setTimeout(async () => {
      console.log(`Updating channel ${channel.title}`);
      await addNewItems(channel);
      startUpdating(channel);
    }, 5000);
  };

  formElement.addEventListener('submit', async (e) => {
    e.preventDefault();
    state.urlForm.state = 'waiting';
    const url = urlInput.value;
    try {
      const rawRss = await fetchRawRss(url);
      const channelProps = parseChannel(rawRss);
      const channel = { ...channelProps, url, id: uniqueId('feed_') };
      state.channels = [channel, ...state.channels];
      addNewItems(channel, rawRss);
      startUpdating(channel);
      state.urlForm.state = 'empty';
      urlInput.value = '';
    } catch (error) {
      state.urlForm.state = 'invalid';
      state.urlForm.errorMsg = 'Something wrong with this feed';
    }
  });

  channelsList.addEventListener('click', (event) => {
    event.preventDefault();
    const link = event.target.closest('.feed-item');
    if (!link) {
      return;
    }
    const id = link.dataset.feedId;
    state.chanelsFilter = id;
  });

  $('#modal').on('show.bs.modal', (event) => {
    const button = $(event.relatedTarget);
    const feedId = button.data('feed-id');
    const guid = button.data('guid');
    const { description, title, link } = state.items
      .find(item => item.feedId === feedId && item.guid === guid);
    const modal = $(event.currentTarget);
    modal.find('.modal-title').text(title);
    modal.find('.description').html(description);
    modal.find('.open-link').attr('href', link);
  });
};
