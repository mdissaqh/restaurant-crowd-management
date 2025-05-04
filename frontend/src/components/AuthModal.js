import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Alert, FloatingLabel } from 'react-bootstrap';
import axios from 'axios';

export default function AuthModal({ show, onHide, onLogin }) {
  const [mode, setMode] = useState('login');
  const [formData, setFormData] = useState({ name: '', mobile: '', email: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const endpoint = mode === 'signup' ? '/auth/register' : '/auth/login';
      const { data } = await axios.post(endpoint, formData);
      onLogin(data.user, data.token);
      onHide();
    } catch (err) {
      setError(err.response?.data?.error || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="md">
      <div>
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="w-100 text-center">
            <h3 className="fw-bold">
              {mode === 'login' ? 'Welcome Back!' : 'Create Account'}
            </h3>
          </Modal.Title>
        </Modal.Header>

        <Modal.Body className="pt-0">
          <div className="d-flex gap-2 mb-4 justify-content-center">
            <Button
              variant={mode === 'login' ? 'primary' : 'outline-primary'}
              onClick={() => setMode('login')}
              className="rounded-pill px-4"
            >
              Login
            </Button>
            <Button
              variant={mode === 'signup' ? 'primary' : 'outline-primary'}
              onClick={() => setMode('signup')}
              className="rounded-pill px-4"
            >
              Sign Up
            </Button>
          </div>

          <Form onSubmit={handleSubmit}>
            {error && <Alert variant="danger">{error}</Alert>}

            {mode === 'signup' && (
              <FloatingLabel controlId="name" label="Full Name" className="mb-3">
                <Form.Control
                  type="text"
                  placeholder="John Doe"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </FloatingLabel>
            )}

            <FloatingLabel controlId="mobile" label="Mobile Number" className="mb-3">
              <Form.Control
                type="tel"
                pattern="[0-9]{10}"
                placeholder="9876543210"
                required
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              />
            </FloatingLabel>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-100 mt-3"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </Form>
        </Modal.Body>
      </div>
    </Modal>
  );
}