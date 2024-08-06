const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const xml2js = require('xml2js');
const Groq = require("groq-sdk");
const cors = require('cors');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: "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" });

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const truncateText = (text, maxLength = 1000) => {
  if (text.length <= maxLength) return text;
  return text.substr(0, maxLength) + '...';
};

async function fetchSitemap(url) {
  const response = await axios.get(url);
  const result = await xml2js.parseStringPromise(response.data);
  return result;
}

app.post('/scrape', async (req, res) => {
  const { domain } = req.body;
  const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, '');

  try {
    const sitemapIndexUrl = `https://${cleanDomain}/sitemap.xml`;
    const sitemapIndex = await fetchSitemap(sitemapIndexUrl);

    let productSitemapUrl;
    if (sitemapIndex.sitemapindex) {
      productSitemapUrl = sitemapIndex.sitemapindex.sitemap.find(
        sitemap => sitemap.loc[0].includes('products')
      ).loc[0];
    } else {
      productSitemapUrl = sitemapIndexUrl;
    }

    const productSitemap = await fetchSitemap(productSitemapUrl);

    const products = productSitemap.urlset.url
      .filter(url => url.loc[0].includes('/products/'))
      .slice(0, 5)
      .map(url => ({
        link: url.loc[0],
        image: url['image:image'] ? url['image:image'][0]['image:loc'][0] : '',
        title: url['image:image'] ? url['image:image'][0]['image:title'][0] : '',
      }));

    for (let product of products) {
      const productPage = await axios.get(product.link);
      const $ = cheerio.load(productPage.data);
      const productContent = truncateText($('meta[name="description"]').attr('content') || $('body').text());

      let retries = 3;
      while (retries > 0) {
        try {
          const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: `Summarize this product description in 4 bullet points, each no more than 10 words: ${productContent}` }],
            model: "llama3-8b-8192",
          });

          product.summary = chatCompletion.choices[0]?.message?.content.split('\n').filter(point => point.trim() !== '') || [];
          break;
        } catch (error) {
          if (error.status === 429 && retries > 1) {
            console.log(`Rate limit reached. Retrying in 16 seconds...`);
            await delay(16000);
            retries--;
          } else {
            throw error;
          }
        }
      }
    }

    res.json(products);
  } catch (error) {
    console.error('Error details:', error.message);
    if (error.response) {
      console.error('Error response:', error.response.data);
      console.error('Error status:', error.response.status);
    }
    res.status(500).json({ error: error.message, details: error.toString() });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});