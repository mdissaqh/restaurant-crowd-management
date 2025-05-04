import React from 'react';
import { Dropdown } from 'react-bootstrap';
import { FiUser } from 'react-icons/fi';

export default function ProfileMenu({ user }) {
  return (
    <Dropdown>
      <Dropdown.Toggle variant="link" className="text-dark">
        <FiUser size={24} />
      </Dropdown.Toggle>
      
      <Dropdown.Menu>
        <Dropdown.Header>
          <p className="mb-0 fw-bold">{user.name}</p>
          <small className="text-muted">{user.email}</small>
        </Dropdown.Header>
        <Dropdown.Item href="/orders">My Orders</Dropdown.Item>
        <Dropdown.Item href="/settings">Settings</Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Item>Logout</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}