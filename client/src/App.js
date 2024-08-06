import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Container, TextField, Button, Grid, Card, CardContent, CardMedia, 
  Typography, CircularProgress, Snackbar, AppBar, Toolbar, Zoom, Grow
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { styled } from '@mui/system';

const AnimatedCard = styled(Card)(({ theme }) => ({
  transition: 'transform 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
  '&:hover': {
    transform: 'translateY(-10px)',
    boxShadow: theme.shadows[10],
  },
}));

const BulletLessTypography = styled(Typography)({
  '& ul': {
    paddingLeft: 0,
    listStyleType: 'none',
  },
  '& li': {
    marginBottom: '8px',
    '&:before': {
      content: '"•"',
      marginRight: '8px',
      color: '#1976d2',
    },
  },
});

function App() {
  const [products, setProducts] = useState([]);
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setProducts([]);
    try {
      const response = await axios.post('http://localhost:3001/scrape', { domain });
      setProducts(response.data);
    } catch (error) {
      console.error('Error:', error);
      setError('Failed to fetch products. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Product Scraper
          </Typography>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Zoom in={true} style={{ transitionDelay: '300ms' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', marginBottom: '2rem' }}>
            <TextField
              fullWidth
              variant="outlined"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Enter domain (e.g., example.com)"
              sx={{ mr: 2 }}
            />
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              startIcon={<SearchIcon />}
              disabled={loading}
            >
              Scrape
            </Button>
          </form>
        </Zoom>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '2rem' }}>
            <CircularProgress />
          </div>
        )}

        <Grid container spacing={3}>
          {products.map((product, index) => (
            <Grow
              in={true}
              style={{ transformOrigin: '0 0 0' }}
              {...{ timeout: 1000 + index * 500 }}
              key={index}
            >
              <Grid item xs={12} sm={6} md={4}>
                <AnimatedCard sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={product.image}
                    alt={product.title}
                  />
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography gutterBottom variant="h5" component="div">
                      {product.title}
                    </Typography>
                    <BulletLessTypography variant="body2">
                      <ul>
                        {product.summary && product.summary.slice(1).map((point, i) => (
                          <li key={i}>{point}</li>
                        ))}
                      </ul>
                    </BulletLessTypography>
                  </CardContent>
                </AnimatedCard>
              </Grid>
            </Grow>
          ))}
        </Grid>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError('')}
          message={error}
        />
      </Container>
    </>
  );
}

export default App;